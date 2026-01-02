import BookingSystem from "../components/bookingSystem";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <BookingSystem />
      </div>
    </main>
  );
} 