import Grid from './components/Grid';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">The Mine ⛏️</h1>
      <Grid />
    </main>
  );
}
