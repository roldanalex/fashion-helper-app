export const metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-4xl">Welcome to Aether Wardrobe</h1>
      <p className="mt-3 text-muted-foreground">
        The onboarding wizard arrives in milestone M2.
      </p>
    </main>
  );
}
