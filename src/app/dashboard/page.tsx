"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FlightData, FlightStats } from "@/types";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatElapsed(startTime: string): string {
  const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function MonthlyChart({ flights }: { flights: FlightData[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  const dailyMinutes: number[] = Array(daysInMonth).fill(0);

  flights
    .filter((f) => f.endTime && f.duration)
    .forEach((f) => {
      const d = new Date(f.startTime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        dailyMinutes[d.getDate() - 1] += f.duration!;
      }
    });

  const maxMinutes = Math.max(...dailyMinutes, 60);
  const monthName = now.toLocaleString("default", { month: "long" });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          {monthName} {year}
        </h3>
        <span className="text-xs text-gray-500">
          {formatDuration(dailyMinutes.reduce((a, b) => a + b, 0))} total
        </span>
      </div>
      <div className="flex items-end gap-[2px] h-24">
        {dailyMinutes.map((mins, i) => {
          const height = mins > 0 ? Math.max((mins / maxMinutes) * 100, 8) : 0;
          const isToday = i === now.getDate() - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className={`w-full rounded-sm transition-all ${
                  isToday
                    ? "bg-indigo-500"
                    : mins > 0
                    ? "bg-indigo-300 group-hover:bg-indigo-400"
                    : "bg-gray-100"
                }`}
                style={{ height: mins > 0 ? `${height}%` : "3px" }}
              />
              {mins > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {formatDuration(mins)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>1</span>
        <span>{Math.ceil(daysInMonth / 2)}</span>
        <span>{daysInMonth}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [stats, setStats] = useState<FlightStats>({ monthlyMinutes: 0, lifetimeMinutes: 0, totalFlights: 0 });
  const [activeFlight, setActiveFlight] = useState<FlightData | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [flightNumber, setFlightNumber] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      fetchFlights();
    }
  }, [status]);

  const fetchFlights = useCallback(async () => {
    const res = await fetch("/api/flights");
    if (res.ok) {
      const data = await res.json();
      setFlights(data.flights);
      setStats(data.stats);
      const active = data.flights.find((f: FlightData) => !f.endTime);
      setActiveFlight(active || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!activeFlight) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(activeFlight.startTime));
    }, 1000);
    setElapsed(formatElapsed(activeFlight.startTime));
    return () => clearInterval(interval);
  }, [activeFlight]);

  const startFlight = async () => {
    setActing(true);
    const res = await fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightNumber: flightNumber || undefined,
        fromCity: fromCity || undefined,
        toCity: toCity || undefined,
      }),
    });
    if (res.ok) {
      setFlightNumber("");
      setFromCity("");
      setToCity("");
      setShowDetails(false);
      await fetchFlights();
    }
    setActing(false);
  };

  const stopFlight = async () => {
    if (!activeFlight) return;
    setActing(true);
    const res = await fetch(`/api/flights/${activeFlight.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      await fetchFlights();
    }
    setActing(false);
  };

  const deleteFlight = async (id: string) => {
    if (!confirm("Delete this flight?")) return;
    const res = await fetch(`/api/flights/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchFlights();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your flights...</p>
        </div>
      </div>
    );
  }

  const isLongFlight = activeFlight && (Date.now() - new Date(activeFlight.startTime).getTime()) > 24 * 60 * 60 * 1000;
  const userName = session?.user?.name?.split(" ")[0] || "Pilot";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {userName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeFlight ? "You have a flight in progress" : "Ready for your next flight?"}
        </p>
      </div>

      {isLongFlight && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          This flight has been active for over 24 hours. Did you forget to stop it?
        </div>
      )}

      {/* Active Flight / Start Flight */}
      <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
        {activeFlight ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-indigo-200 uppercase tracking-wide font-medium">Live Flight</span>
            </div>
            {(activeFlight.flightNumber || activeFlight.fromCity) && (
              <p className="text-indigo-200 text-sm mb-1">
                {activeFlight.flightNumber && <span className="font-mono">{activeFlight.flightNumber}</span>}
                {activeFlight.fromCity && activeFlight.toCity && (
                  <span> &middot; {activeFlight.fromCity} → {activeFlight.toCity}</span>
                )}
              </p>
            )}
            <p className="text-5xl font-mono font-bold tracking-tight my-4">{elapsed}</p>
            <p className="text-xs text-indigo-200 mb-5">
              Departed {new Date(activeFlight.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </p>
            <button
              onClick={stopFlight}
              disabled={acting}
              className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 shadow-md"
            >
              {acting ? "Landing..." : "Stop Flight"}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-4xl mb-3">✈️</p>
            <p className="text-indigo-200 text-sm mb-4">Tap to start tracking your flight</p>

            {showDetails && (
              <div className="grid grid-cols-3 gap-2 mb-4 max-w-sm mx-auto">
                <input
                  type="text"
                  placeholder="Flight #"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <input
                  type="text"
                  placeholder="From"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <input
                  type="text"
                  placeholder="To"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startFlight}
                disabled={acting}
                className="bg-white text-indigo-700 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 shadow-md"
              >
                {acting ? "Starting..." : "Start Flight"}
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-indigo-200 hover:text-white transition-colors"
              >
                {showDetails ? "Hide details" : "+ Add flight details (optional)"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 text-center">
          <div className="text-2xl mb-1">🕐</div>
          <p className="text-xl font-bold text-indigo-700">{formatDuration(stats.monthlyMinutes)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">This Month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-4 text-center">
          <div className="text-2xl mb-1">🌍</div>
          <p className="text-xl font-bold text-purple-700">{formatDuration(stats.lifetimeMinutes)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Lifetime</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4 text-center">
          <div className="text-2xl mb-1">✈️</div>
          <p className="text-xl font-bold text-emerald-700">{stats.totalFlights}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total Flights</p>
        </div>
      </div>

      {/* Monthly Chart */}
      <MonthlyChart flights={flights} />

      {/* Flight History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Flight History</h2>
        {flights.filter((f) => f.endTime).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <p className="text-3xl mb-2">🛫</p>
            <p className="text-gray-500 text-sm">No flights logged yet. Start your first flight above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flights
              .filter((f) => f.endTime)
              .map((flight) => (
                <div key={flight.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900">
                          {new Date(flight.startTime).toLocaleDateString(undefined, {
                            weekday: "short", month: "short", day: "numeric",
                          })}
                        </p>
                        {flight.flightNumber && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium">
                            {flight.flightNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(flight.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {" → "}
                        {new Date(flight.endTime!).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {flight.fromCity && flight.toCity && (
                          <span className="ml-2 text-gray-400">
                            {flight.fromCity} → {flight.toCity}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-indigo-600 text-sm">{formatDuration(flight.duration!)}</span>
                      <button
                        onClick={() => deleteFlight(flight.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
