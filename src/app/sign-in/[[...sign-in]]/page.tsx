import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in | SMGray Tools",
};

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="eyebrow">SMGray</p>
          <h1 className="display-title mt-2 text-5xl">Private Tools</h1>
        </div>
        <SignIn
          appearance={{
            elements: {
              cardBox: "shadow-none",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-in"
        />
      </div>
    </main>
  );
}
