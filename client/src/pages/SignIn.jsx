import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="auth-page">
      <h1>Sign in</h1>
      <p className="muted">Access your garden plants dashboard.</p>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
