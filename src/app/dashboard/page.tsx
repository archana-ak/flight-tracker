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

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [stats, setStats] = useState<FlightStats>({ monthlyMinutes: 0, lifetimeMinutes: 0, totalFlights: 0 });
  const [activeFlight, setActiveFlight] = useState<FlightData | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

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
    const res = await fetch("/api/flights", { method: "POST" });
    if (res.ok) {
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
        <svg className="animate-spin h-10 w-10 text-indigo-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const isLongFlight = activeFlight && (Date.now() - new Date(activeFlight.startTime).getTime()) > 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {isLongFlight && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 text-sm">
          This flight has been active for over 24 hours. Did you forget to stop it?
        </div>
      )}

      {/* Flight Button */}
      <div className="text-center mb-8">
        {activeFlight ? (
          <div>
            <p className="text-sm text-gray-500 mb-2">Flight in progress</p>
            <p className="text-4xl font-mono font-bold text-indigo-600 mb-4">{elapsed}</p>
            <button
              onClick={stopFlight}
              disabled={acting}
              className="w-40 h-40 rounded-full bg-red-500 hover:bg-red-600 text-white text-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {acting ? "Stopping..." : "Stop Flight"}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Started {new Date(activeFlight.startTime).toLocaleString()}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">Tap to start tracking</p>
            <button
              onClick={startFlight}
              disabled={acting}
              className="w-40 h-40 rounded-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {acting ? "Starting..." : "Start Flight"}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{formatDuration(stats.monthlyMinutes)}</p>
          <p className="text-xs text-gray-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{formatDuration(stats.lifetimeMinutes)}</p>
          <p className="text-xs text-gray-500 mt-1">Lifetime</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{stats.totalFlights}</p>
          <p className="text-xs text-gray-500 mt-1">Total Flights</p>
        </div>
      </div>

      {/* Flight History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Flight History</h2>
        {flights.filter((f) => f.endTime).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500 text-sm">No flights logged yet. Tap the button above to start!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flights
              .filter((f) => f.endTime)
              .map((flight) => (
                <div key={flight.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(flight.startTime).toLocaleDateString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(flight.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {new Date(flight.endTime!).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {flight.note && <p className="text-xs text-gray-400 mt-1">{flight.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-indigo-600">{formatDuration(flight.duration!)}</span>
                    <button onClick={() => deleteFlight(flight.id)} className="text-gray-400 hover:text-red-500 text-sm">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
