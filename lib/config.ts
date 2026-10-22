// Las variables NEXT_PUBLIC_* se incrustan al compilar (next build). No contienen secretos.
export const config = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  region: process.env.NEXT_PUBLIC_COGNITO_REGION ?? "us-east-1",
  // Solo para pruebas locales: permite apuntar a un Cognito simulado.
  cognitoEndpoint: process.env.NEXT_PUBLIC_COGNITO_ENDPOINT ?? "",
};
