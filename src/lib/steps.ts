// Plain-English flow step shared by the manual flow builder and the MCP
// tools. No selectors, no browser actions — the connecting AI verifies each
// step by reading the actual source code.

export interface StepDef {
  id?: string;
  order: number;
  description: string; // e.g. "User clicks the Login button on the home page"
  expectedOutcome?: string | null; // e.g. "Redirected to /login"
}

// A starting point for the manual builder, matching the example from the
// product brief: Home -> Login -> credentials -> submit -> verified.
export const LOGIN_FLOW_TEMPLATE: StepDef[] = [
  { order: 0, description: "User visits the home page", expectedOutcome: null },
  { order: 1, description: "User clicks a Login button/link", expectedOutcome: "A Login link/button exists and is reachable from the home page" },
  { order: 2, description: "Clicking Login navigates the user", expectedOutcome: "Redirected to /login" },
  { order: 3, description: "User enters email and password", expectedOutcome: "Fields exist with basic client-side validation (required, email format)" },
  { order: 4, description: "User submits the form", expectedOutcome: "Credentials are sent to a real API endpoint that verifies them" },
  { order: 5, description: "On success, user is taken past the login page", expectedOutcome: "Redirected to an authenticated area, with an error path handled for bad credentials" },
];

export function otherTemplates(): { name: string; description: string; steps: StepDef[] }[] {
  return [
    { name: "Login", description: "Home -> Login -> enter credentials -> submit -> verified", steps: LOGIN_FLOW_TEMPLATE },
    {
      name: "Signup",
      description: "Home -> Signup -> fill form -> submit -> account created",
      steps: [
        { order: 0, description: "User visits the home page" },
        { order: 1, description: "User clicks a Sign up button/link", expectedOutcome: "A Sign up link exists and is reachable from the home page" },
        { order: 2, description: "Clicking Sign up navigates the user", expectedOutcome: "Redirected to /signup" },
        { order: 3, description: "User fills email/password (and any required fields)", expectedOutcome: "Fields validated client-side before submit" },
        { order: 4, description: "User submits the signup form", expectedOutcome: "A real API call creates the account, with duplicate-email and weak-password errors handled" },
      ],
    },
    {
      name: "Forgot password",
      description: "Login page -> Forgot password -> enter email -> submit -> confirmation",
      steps: [
        { order: 0, description: "User visits the login page" },
        { order: 1, description: "User clicks 'Forgot password'", expectedOutcome: "A forgot-password link exists on the login page" },
        { order: 2, description: "User enters their email and submits", expectedOutcome: "A real API call triggers a reset email" },
        { order: 3, description: "User sees confirmation", expectedOutcome: "A confirmation message/state is shown regardless of whether the email exists (no user enumeration)" },
      ],
    },
    {
      name: "Checkout",
      description: "Cart -> Checkout -> shipping/payment -> place order -> confirmation",
      steps: [
        { order: 0, description: "User visits the cart page" },
        { order: 1, description: "User clicks Checkout", expectedOutcome: "A checkout link/button exists on the cart page" },
        { order: 2, description: "Clicking Checkout navigates the user", expectedOutcome: "Redirected to /checkout" },
        { order: 3, description: "User fills shipping/payment details and places the order", expectedOutcome: "A real API call processes the order, with validation and payment-failure states handled" },
        { order: 4, description: "User sees order confirmation", expectedOutcome: "A confirmation page/state is shown after a successful order" },
      ],
    },
  ];
}
