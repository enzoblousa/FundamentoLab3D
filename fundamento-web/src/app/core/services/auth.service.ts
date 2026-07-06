import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, RegisterResponse } from '../models';

const TOKEN_KEY = 'fundamento_token';
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokenSignal = signal<string | null>(readStoredToken());

  private payload = computed<Record<string, unknown> | null>(() => {
    const token = this.tokenSignal();
    return token ? decodePayload(token) : null;
  });

  readonly isLoggedIn = computed(() => this.payload() !== null);
  readonly email = computed(() => (this.payload()?.['email'] as string) ?? null);
  readonly role = computed(
    () => ((this.payload()?.['role'] ?? this.payload()?.[ROLE_CLAIM]) as string) ?? null
  );
  readonly isAdmin = computed(() => this.role() === 'Admin');

  get token(): string | null {
    return this.tokenSignal();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(res => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this.tokenSignal.set(res.token);
        })
      );
  }

  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, {
      email,
      password
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
  }
}

function readStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const exp = decodePayload(token)?.['exp'] as number | undefined;
  if (!exp || exp * 1000 <= Date.now()) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
