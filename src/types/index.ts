export interface FlightData {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  note: string | null;
  flightNumber: string | null;
  fromCity: string | null;
  toCity: string | null;
  createdAt: string;
}

export interface FlightStats {
  monthlyMinutes: number;
  lifetimeMinutes: number;
  totalFlights: number;
}
