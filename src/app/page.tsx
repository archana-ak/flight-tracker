import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-6xl mb-6">✈️</p>
          <h1 className="text-4xl font-bold mb-4">Track Your Flight Hours</h1>
          <p className="text-lg text-indigo-200 max-w-xl mx-auto mb-8">
            Simple one-tap flight logging. Start when you board, stop when you land.
            See your monthly and lifetime stats at a glance.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-indigo-700 px-6 py-3 rounded-xl text-lg font-bold hover:bg-indigo-50 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="border border-white/30 text-white px-6 py-3 rounded-xl text-lg font-medium hover:bg-white/10 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 max-w-3xl mx-auto px-4">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-3xl mb-3">⏱️</p>
            <h3 className="font-semibold mb-1">One-Tap Tracking</h3>
            <p className="text-sm text-gray-600">Start and stop with a single tap. No complex setup.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-3xl mb-3">📊</p>
            <h3 className="font-semibold mb-1">Monthly Stats</h3>
            <p className="text-sm text-gray-600">See your flight hours by month and lifetime total.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-3xl mb-3">🔋</p>
            <h3 className="font-semibold mb-1">Zero Battery Drain</h3>
            <p className="text-sm text-gray-600">No background processes. Works even when your phone is off.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
