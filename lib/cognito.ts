// Llamadas directas a la API pública de Amazon Cognito (no necesitan credenciales de AWS).
// La contraseña viaja por HTTPS directamente a Cognito; nunca pasa por la API de Winware.
import { config } from "./config";

export class CognitoError extends Error {
  codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = "CognitoError";
    this.codigo = codigo;
  }
}

const MENSAJES: Record<string, string> = {
  NotAuthorizedException: "Correo o contraseña incorrectos.",
  UserNotFoundException: "Correo o contraseña incorrectos.",
  UserNotConfirmedException: "Tu correo aún no está confirmado.",
  UsernameExistsException: "Ya existe una cuenta con ese correo.",
  InvalidPasswordException: "La contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula y número.",
  CodeMismatchException: "El código no es correcto.",
  ExpiredCodeException: "El código venció. Pide uno nuevo.",
  LimitExceededException: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  TooManyRequestsException: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  TooManyFailedAttemptsException: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  PasswordResetRequiredException: "Debes restablecer tu contraseña.",
  InvalidParameterException: "Revisa los datos ingresados.",
};

export interface Tokens { idToken: string; accessToken: string; refreshToken: string; expiraEn: number }

const url = () => config.cognitoEndpoint || `https://cognito-idp.${config.region}.amazonaws.com/`;

async function llamar<T>(operacion: string, cuerpo: Record<string, unknown>): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url(), {
      method: "POST",
      headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AWSCognitoIdentityProviderService.${operacion}` },
      body: JSON.stringify({ ClientId: config.clientId, ...cuerpo }),
    });
  } catch {
    throw new CognitoError("Red", "No hay conexión con el servicio de acceso. Revisa tu internet.");
  }
  let json: any = {};
  try { json = await r.json(); } catch { /* respuesta vacía */ }
  if (!r.ok) {
    const codigo = String(json.__type ?? "Error").split("#").pop()!;
    throw new CognitoError(codigo, MENSAJES[codigo] ?? json.message ?? "No se pudo completar la operación.");
  }
  return json as T;
}

function aTokens(r: any, refreshPrevio?: string): Tokens {
  return {
    idToken: r.IdToken, accessToken: r.AccessToken, refreshToken: r.RefreshToken ?? refreshPrevio ?? "",
    expiraEn: Date.now() + (Number(r.ExpiresIn) || 3600) * 1000,
  };
}

export type ResultadoInicio =
  | { tipo: "ok"; tokens: Tokens }
  | { tipo: "nueva-clave"; sesion: string };

export async function iniciarSesion(correo: string, clave: string): Promise<ResultadoInicio> {
  const r: any = await llamar("InitiateAuth", { AuthFlow: "USER_PASSWORD_AUTH", AuthParameters: { USERNAME: correo.trim().toLowerCase(), PASSWORD: clave } });
  if (r.ChallengeName === "NEW_PASSWORD_REQUIRED") return { tipo: "nueva-clave", sesion: r.Session };
  if (!r.AuthenticationResult) throw new CognitoError("Desafio", "Cognito pidió un paso adicional que este portal no soporta.");
  return { tipo: "ok", tokens: aTokens(r.AuthenticationResult) };
}

export async function definirNuevaClave(correo: string, nuevaClave: string, sesion: string): Promise<Tokens> {
  const r: any = await llamar("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED", Session: sesion,
    ChallengeResponses: { USERNAME: correo.trim().toLowerCase(), NEW_PASSWORD: nuevaClave },
  });
  if (!r.AuthenticationResult) throw new CognitoError("Desafio", "No se pudo completar el cambio de contraseña.");
  return aTokens(r.AuthenticationResult);
}

export async function renovar(refreshToken: string): Promise<Tokens> {
  const r: any = await llamar("InitiateAuth", { AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: refreshToken } });
  return aTokens(r.AuthenticationResult, refreshToken);
}

export async function registrar(nombre: string, correo: string, clave: string): Promise<void> {
  await llamar("SignUp", {
    Username: correo.trim().toLowerCase(), Password: clave,
    UserAttributes: [{ Name: "email", Value: correo.trim().toLowerCase() }, { Name: "name", Value: nombre.trim() }],
  });
}
export const confirmar = (correo: string, codigo: string) =>
  llamar("ConfirmSignUp", { Username: correo.trim().toLowerCase(), ConfirmationCode: codigo.trim() }).then(() => undefined);
export const reenviarCodigo = (correo: string) =>
  llamar("ResendConfirmationCode", { Username: correo.trim().toLowerCase() }).then(() => undefined);
export const olvideMiClave = (correo: string) =>
  llamar("ForgotPassword", { Username: correo.trim().toLowerCase() }).then(() => undefined);
export const restablecerClave = (correo: string, codigo: string, clave: string) =>
  llamar("ConfirmForgotPassword", { Username: correo.trim().toLowerCase(), ConfirmationCode: codigo.trim(), Password: clave }).then(() => undefined);
