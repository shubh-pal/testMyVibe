export async function checkedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const response = await fetch(input, init);
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : response.status === 404
          ? "This item is unavailable or belongs to another workspace."
          : "The request failed. Please try again.",
    );
  return response;
}
