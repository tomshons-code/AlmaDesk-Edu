# Rozdział 4. Testowanie i ocena systemu

## 4.1. Testy funkcjonalne

### 4.1.1. Strategia testowania

Weryfikację poprawności działania systemu AlmaDesk-Edu oparto na podejściu **Test-Driven Development (TDD)** z wykorzystaniem automatycznych testów jednostkowych i integracyjnych. Przyjęta strategia obejmuje trzy poziomy testowania:

1. **Testy jednostkowe** — weryfikacja izolowanych komponentów logiki biznesowej (walidacja danych wejściowych, kontrola uprawnień RBAC, transformacje danych).
2. **Testy integracyjne** — weryfikacja współpracy między warstwami systemu (kontroler → serwis → baza danych) z wykorzystaniem mockowanych zależności zewnętrznych.
3. **Testy end-to-end (E2E)** — weryfikacja kompletnych scenariuszy użytkownika na działającym stosie kontenerów Docker.

### 4.1.2. Środowisko i narzędzia testowe

| Narzędzie | Wersja | Zastosowanie |
|-----------|--------|--------------|
| **Jest** | 29.7.0 | Framework testowy (runner, asercje, mockowanie) |
| **Supertest** | 7.2.2 | Testowanie HTTP REST API (symulacja żądań) |
| **Prisma Mock** | Custom | Mockowanie klienta ORM Prisma (izolacja od bazy danych) |
| **Docker Compose** | — | Orchestracja infrastruktury testowej |

Konfiguracja frameworka Jest zdefiniowana w pliku `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 15000,
  verbose: true,
}
```

Plik `setup.js` odpowiada za inicjalizację środowiska testowego poprzez mockowanie wszystkich zewnętrznych zależności: bazy danych (Prisma), cache (Redis), wyszukiwarki (Elasticsearch), magazynu plików (MinIO), poczty email (Nodemailer), usługi audytu, mechanizmu SSO (Keycloak) oraz alertów nawracających. Dzięki temu testy mogą działać w pełnej izolacji od infrastruktury, co zapewnia powtarzalność i szybkość wykonania.

### 4.1.3. Architektura testów

Testy zorganizowano w **4 pliki testowe** (32 testy jednostkowe/integracyjne) oraz **6 plików E2E** (37 testów end-to-end), pogrupowanych wg przypadków testowych (TC — Test Case). Każdy plik zawiera bloki `describe` dla poszczególnych scenariuszy oraz testy `test`/`it` weryfikujące konkretne asercje.

**Struktura katalogów testowych (backend — Jest):**

```
__tests__/
├── setup.js                          # Globalna konfiguracja mocków
├── helpers/
│   ├── auth.helper.js                # Generowanie tokenów JWT dla 4 ról
│   ├── fixtures.js                   # Dane testowe (użytkownicy, zgłoszenia, komentarze)
│   └── prisma.mock.js                # Mockowany klient Prisma (15+ modeli)
├── tc-01-02.auth-sso.test.js         # Logowanie SSO i uwierzytelnianie (17 testów)
├── tc-04.client-creation.test.js     # Tworzenie klienta z poziomu zgłoszenia (4 testy)
├── tc-07-08.dashboard.test.js        # Dashboard KPI (KLIENT vs AGENT) (6 testów)
└── tc-41-42.health-infra.test.js     # Health check i infrastruktura (5 testów)
```

**Struktura katalogów testowych (frontend — Playwright E2E):**

```
e2e/
├── helpers/
│   └── fixtures.js                   # Dane logowania, selektory CSS, fixture authenticatedPage
├── tc-01-02.login.spec.js            # Logowanie i wylogowanie (7 testów)
├── tc-05-06.search.spec.js           # Wyszukiwanie i filtrowanie (6 testów)
├── tc-07-08.dashboard.spec.js        # Dashboard agenta i portal klienta (5 testów)
├── tc-09.create-ticket.spec.js       # Tworzenie zgłoszenia (5 testów)
├── tc-14-50.client-panel.spec.js     # Panel klienta i ograniczenia (5 testów)
└── tc-37-44.rbac.spec.js             # Kontrola dostępu RBAC (9 testów)
```

### 4.1.4. Helpery testowe

#### Generator tokenów JWT (auth.helper.js)

Moduł definiuje czterech testowych użytkowników odpowiadających wszystkim rolom systemowym i generuje dla nich ważne tokeny JWT:

```javascript
const users = {
  klient:    { id: 1, login: 'klient1',     role: 'KLIENT' },
  agent:     { id: 2, login: 'agent1',       role: 'AGENT' },
  admin:     { id: 3, login: 'admin1',       role: 'ADMIN' },
  superAdmin:{ id: 4, login: 'superadmin1',  role: 'SUPER_ADMIN' },
}
```

Funkcja `authHeader(user)` generuje nagłówek `Authorization: Bearer <token>`, co pozwala testom symulować żądania autoryzowane. Funkcja `expiredToken(user)` tworzy natychmiast wygasający token na potrzeby testów walidacji sesji.

#### Dane wzorcowe (fixtures.js)

Moduł eksportuje fabryki danych testowych z możliwością nadpisywania atrybutów:

| Fabryka | Opis | Pola kluczowe |
|---------|------|---------------|
| `sampleUsers` | 4 użytkowników (KLIENT, AGENT, ADMIN, SUPER_ADMIN) | hasło bcrypt, podpis agenta, preferencje powiadomień, MFA |
| `createSampleTicket()` | Zgłoszenie helpdesk | status, priorytet, kategoria, źródło, lokalizacja, wydział, laboratorium |
| `createSampleComment()` | Komentarz do zgłoszenia | treść, flagi: `isInternal`, `isEdited` |
| `createSampleTag()` | Tag z kolorem | nazwa, kolor hex, licznik powiązanych zgłoszeń |
| `createSampleChangeRequest()` | Wniosek o zmianę (ITIL) | workflow statusów, daty zatwierdzenia/wdrożenia |
| `createSampleKBArticle()` | Artykuł bazy wiedzy | status (PUBLISHED/DRAFT), `viewCount`, `helpfulCount` |
| `createSampleRecurringAlert()` | Alert nawracający | severity, `occurrenceCount`, `uniqueUsers`, sugerowana akcja |

#### Mock ORM Prisma (prisma.mock.js)

Mockowany klient Prisma obejmuje **15 modeli bazodanowych** z pełnym zestawem operacji CRUD:

- `user`, `ticket`, `comment`, `tag`, `ticketTag`, `attachment`
- `responseTemplate`, `auditLog`, `systemSettings`, `categoryMapping`
- `organizationalUnit`, `changeRequest`, `changeAuditLog`
- `recurringAlert`, `recurringAlertTicket`, `knowledgeBaseArticle`

Każdy model posiada zamockowane metody: `findUnique`, `findFirst`, `findMany`, `create`, `update`, `delete`, `count`, `groupBy`. Mock obsługuje również `$transaction`, `$connect`, `$disconnect` oraz `$queryRaw`.

Funkcja `resetAllMocks()` wywoływana w `beforeEach()` czyści stan wszystkich mocków między testami, zapewniając izolację.

### 4.1.5. Przypadki testowe — przegląd

Opracowano łącznie **50 przypadków testowych** (TC-01 do TC-50), z czego zaimplementowano **69 testów automatycznych** (32 backend + 37 E2E) pokrywających kluczowe scenariusze:
- **24 wymagania funkcjonalne** (F1–F24)
- **11 wymagań niefunkcjonalnych** (NF1–NF11)
- **8 wymagań architektonicznych** (A1–A8)

Każdy przypadek testowy kategoryzowany jest wg priorytetu:

| Priorytet | Liczba TC | Przykłady |
|-----------|-----------|-----------|
| **Krytyczny** | 6 | TC-01 (SSO), TC-09 (Tworzenie zgłoszenia), TC-12 (Statusy), TC-36 (MFA), TC-43 (Backup), TC-44 (Szyfrowanie) |
| **Wysoki** | 28 | TC-02, TC-03, TC-06, TC-07, TC-08, TC-10, TC-11, TC-13, TC-14, TC-15, TC-18, TC-19, TC-21, TC-23, TC-24, TC-25, TC-26, TC-27, TC-29, TC-31, TC-37, TC-38, TC-39, TC-40, TC-50 |
| **Średni** | 13 | TC-05, TC-16, TC-20, TC-22, TC-28, TC-30, TC-32, TC-33, TC-34, TC-35, TC-41, TC-42, TC-47, TC-48, TC-49 |
| **Niski** | 3 | TC-46 (Motywy kolorystyczne) |

### 4.1.6. Szczegółowe scenariusze testowe

#### A. Uwierzytelnianie i autoryzacja (TC-01, TC-02, TC-36, TC-37)

**SSO — Single Sign-On (TC-01, TC-02):**
Testy weryfikują integrację z Keycloak jako pośrednikiem SSO dla czterech dostawców tożsamości: Azure AD, Google, GitHub i GitLab. Sprawdzane aspekty:
- Endpoint `/api/auth/sso/config` zwraca listę aktywnych providerów SSO.
- Endpoint `/api/auth/sso/login?provider=<name>` inicjuje redirect do Keycloak.
- Callback `/api/auth/sso/callback` bez kodu autoryzacyjnego zwraca błąd.
- Dla każdego providera (azure-ad, google, github, gitlab) weryfikowany jest poprawny redirect.

**Logowanie lokalne:**
- Poprawne dane (login + hasło) → token JWT z polami `{id, login, role}`.
- Błędne hasło → HTTP 401.
- Nieistniejący login → HTTP 401.
- Brak danych → HTTP 400.
- Token JWT nie zawiera danych wrażliwych (hasło, email, MFA secret).

**Weryfikacja i odświeżanie tokenu:**
- Ważny token → dane użytkownika (HTTP 200).
- Brak tokenu / wygasły token / nieprawidłowy token → HTTP 401.
- Odświeżenie tokenu generuje nowy JWT z tymi samymi uprawnieniami.

**MFA/TOTP (TC-36):**
- Setup: generowanie sekretu i kodu QR dla użytkownika bez aktywnego MFA.
- Odrzucenie ponownego setupu jeśli MFA jest już włączone.
- Weryfikacja: wymóg podania kodu TOTP do aktywacji.
- Logowanie z MFA: zwraca `{ mfaRequired: true }` zamiast tokenu (wymagana druga faza uwierzytelnienia).
- Status MFA: endpoint zwraca aktualny stan MFA użytkownika.
- Regeneracja kodów zapasowych: wymaga ważnego kodu TOTP.

**RBAC — kontrola dostępu (TC-37):**

| Endpoint | KLIENT | AGENT | ADMIN | SUPER_ADMIN |
|----------|--------|-------|-------|-------------|
| `GET /api/audit` | 403 ✗ | 403 ✗ | 403 ✗ | 200 ✓ |
| `GET /api/users` | 403 ✗ | — | 200 ✓ | 200 ✓ |
| `DELETE /api/users/:id` | 403 ✗ | — | — | 200 ✓ |
| `DELETE /api/tags/:id` | — | 403 ✗ | — | 200 ✓ |
| `POST /api/recurring-alerts/analyze` | — | 403 ✗ | 200 ✓ | 200 ✓ |
| `GET /api/tickets` (własne) | 200 ✓ | 200 ✓ | 200 ✓ | 200 ✓ |

Testy weryfikują również, że 7 chronionych endpointów wymaga tokenu JWT (zwracają HTTP 401 bez nagłówka Authorization):
- `GET /api/tickets`, `POST /api/tickets`, `GET /api/stats/dashboard`
- `GET /api/tags`, `GET /api/templates`, `GET /api/auth/verify`, `POST /api/auth/refresh`

#### B. Zarządzanie zgłoszeniami (TC-04, TC-09, TC-11, TC-12, TC-13)

**Tworzenie zgłoszeń (TC-09):**
- KLIENT tworzy zgłoszenie z portalu → status `OPEN`, priorytet `MEDIUM`, źródło `PORTAL`.
- Walidacja: tytuł i opis są wymagane (HTTP 400 przy braku).
- Wymóg autoryzacji (HTTP 401 bez tokenu).

**Rejestracja w imieniu klienta (TC-11):**
- AGENT rejestruje zgłoszenie telefoniczne → podaje login klienta, tytuł, opis, źródło.
- Akceptowane źródła: `PHONE`, `CHAT`, `WALK_IN`, `TEAMS`.
- KLIENT nie może rejestrować zgłoszeń w imieniu innego użytkownika (HTTP 403).
- Walidacja wymaganych pól: `clientLogin`, `title`, `description`, `source`.

**Tworzenie klienta z poziomu zgłoszenia (TC-04):**
- Rejestracja nowego klienta (quick-create): `email`, `firstName`, `lastName`.
- Automatyczny login generowany z prefiksu adresu email.
- Rola nowego użytkownika: `KLIENT`.
- Duplikacja emaila/loginu → HTTP 400.

**Zarządzanie statusami (TC-12):**
Testowane przejścia między 6 statusami: `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` → `PENDING` → `ON_HOLD`. Weryfikacja automatycznego ustawiania pola `resolvedAt` przy statusie `RESOLVED`.

**Zarządzanie priorytetami (TC-13):**
AGENT może ustawić dowolny z 5 priorytetów: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `ESCALATED`.

#### C. Komentarze i komunikacja (TC-03, TC-19, TC-22)

**Podpis agenta (TC-03):**
- Komentarz publiczny agenta z podpisem → treść zawiera separator `---` i podpis z pola `agentSignature`.
- Komentarz wewnętrzny → podpis **nie jest** dodawany.

**Komentarze wewnętrzne (TC-19):**
- Flaga `isInternal=true` ustawiana poprawnie.
- KLIENT **nie widzi** komentarzy wewnętrznych (filtrowane w odpowiedzi API).
- Dodawanie komentarza wewnętrznego generuje powiadomienia dla agentów.

**Edycja komentarzy (TC-22):**
- Autor komentarza może edytować treść → flaga `isEdited=true`, aktualizacja `updatedAt`.
- Inny użytkownik nie może edytować cudzego komentarza (HTTP 403).

#### D. Wyszukiwanie i filtrowanie (TC-05, TC-06, TC-20)

**Filtrowanie po tagach (TC-05):**
- Parametr `tags` w zapytaniu filtruje zgłoszenia po przypisanych tagach.
- Zwracane tylko zgłoszenia z pasującymi tagami.

**Wyszukiwanie pełnotekstowe — Elasticsearch (TC-06):**
- Endpoint `/api/tickets/search?q=<fraza>` deleguje zapytanie do Elasticsearch.
- Wagi pól: tytuł (×5), opis (×2).
- Obsługa fuzzy matching, dopasowanie frazy, wyszukiwanie po ID (`#123`).
- Podświetlenie (`<mark>`) dopasowanych fragmentów w wynikach.

**Filtrowanie kontekstowe (TC-20):**
- Filtrowanie po wydziale, lokalizacji, laboratorium (case-insensitive).
- Wartości filtrów dynamicznie wyodrębniane z istniejących zgłoszeń.

#### E. Panel klienta i ograniczenia uprawnień (TC-14, TC-50)

**Panel klienta (TC-14):**
- KLIENT widzi wyłącznie własne zgłoszenia.
- Zgłoszenia zamknięte (CLOSED) mogą otrzymać ocenę (1–5 gwiazdek + komentarz).
- Ocena zapisywana: `rating`, `ratingComment`, `ratedAt`.

**Ograniczenia KLIENTA (TC-50):**
- KLIENT może jedynie **zamknąć** (CLOSED) lub **ponownie otworzyć** (reopen) własne zgłoszenie.
- Zmiana na inne statusy (IN_PROGRESS, RESOLVED, PENDING, ON_HOLD) → HTTP 403.
- Zmiana statusu cudzego zgłoszenia → HTTP 403.

#### F. Dashboard KPI (TC-07, TC-08)

**Dashboard KLIENTA (TC-07):**
- Zwraca: łączna liczba zgłoszeń, podział wg statusów (otwarte, w trakcie, rozwiązane, zamknięte), zgłoszenia z ostatnich 7 dni, podział wg priorytetu i kategorii.
- **Nie zawiera**: statystyk agentów, zgłoszeń nieprzypisanych, czasu rozwiązywania.

**Dashboard AGENTA/ADMINA (TC-08):**
- Rozszerzony o: zgłoszenia oczekujące, przypisane do agenta, nieprzypisane, średni czas rozwiązywania, utworzone i rozwiązane dzisiaj, priorytet eskalowany.

#### G. Raportowanie (TC-15, TC-16)

**Raport PDF (TC-15):**
- AGENT/ADMIN pobiera dane raportowe z `/api/reports/data`.
- Eksport PDF generuje dokument z kafelkami statystyk, tabelą zgłoszeń, polskimi etykietami.
- KLIENT nie ma dostępu (HTTP 403).

**Raport Excel (TC-16):**
- Eksport XLSX z dwoma arkuszami: „Podsumowanie" i „Zgłoszenia".
- Obsługa filtrów dat.

#### H. Pozostałe moduły funkcjonalne

**Baza wiedzy — FAQ (TC-21):** Artykuły w statusie PUBLISHED widoczne dla KLIENTA, osobna kontrola dostępu CRUD. Hierarchia folderów, licznik wyświetleń i feedback.

**Szablony odpowiedzi (TC-25):** CRUD szablonów z kontrolą dostępu. Szablony publiczne widoczne dla wszystkich agentów.

**Preferencje powiadomień (TC-28):** Zapis i odczyt 4 flag: `notifyEmail`, `notifyBrowser`, `notifyAssignments`, `notifyTicketUpdates`.

**Zarządzanie zmianami — ITIL (TC-29, TC-30):** Workflow statusów: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SCHEDULED → IN_PROGRESS → IMPLEMENTED → VERIFIED → CLOSED`. Stany terminalne: `REJECTED`, `CANCELLED`. Automatyczne daty i audyt zmian w `ChangeAuditLog`.

**Archiwizacja zgłoszeń (TC-31):** Tylko zgłoszenia CLOSED/RESOLVED mogą być archiwizowane. Przywracanie z archiwum. Kontrola ról — tylko AGENT/ADMIN/SUPER_ADMIN.

**Zarządzanie tagami (TC-33, TC-34):** CRUD z kontrolą dostępu (usuwanie tylko SUPER_ADMIN). Przypisywanie i usuwanie tagów ze zgłoszeń.

**Alerty nawracające (TC-18, TC-32):** Automatyczna detekcja wzorców (algorytm Jaccarda, próg ≥0.7). Workflow: ACTIVE → ACKNOWLEDGED → RESOLVED. Severity: CRITICAL, HIGH, MEDIUM, LOW.

**Log audytu (TC-38):** Paginowane logowanie z filtrowaniem (akcja, data, użytkownik). Dostęp wyłącznie dla SUPER_ADMIN.

### 4.1.7. Macierz pokrycia wymagań testami

#### Wymagania funkcjonalne (F1–F24)

| Wymaganie | Opis | Przypadki testowe | Pokrycie |
|-----------|------|-------------------|----------|
| F1 | SSO (Azure AD, Google, GitHub, GitLab) | TC-01, TC-02 | ✓ Pełne |
| F2 | Identyfikacja agenta (podpis) | TC-03 | ✓ Pełne |
| F3 | Tworzenie klienta z zgłoszenia | TC-04, TC-11 | ✓ Pełne |
| F4 | Wyszukiwanie/filtrowanie po tagu | TC-05, TC-33, TC-34 | ✓ Pełne |
| F5 | Wyszukiwanie po tytule/treści (ES) | TC-06 | ✓ Pełne |
| F6 | Dashboardy KPI wg roli | TC-07, TC-08 | ✓ Pełne |
| F7 | Wielokanałowość (portal, email, telefon, czat) | TC-09, TC-10, TC-11 | ✓ Pełne |
| F8 | Stany i priorytety zgłoszeń | TC-12, TC-13, TC-50 | ✓ Pełne |
| F9 | Historia i status w panelu klienta | TC-14 | ✓ Pełne |
| F10 | Moduł raportowania | TC-15, TC-16 | ✓ Pełne |
| F11 | Raporty automatyczne | TC-15, TC-16, TC-17 | ✓ Pełne |
| F12 | Alerty o nawracających problemach | TC-18, TC-32 | ✓ Pełne |
| F13 | Komentarze wewnętrzne | TC-19 | ✓ Pełne |
| F14 | Filtrowanie wg wydziałów/lokalizacji | TC-20 | ✓ Pełne |
| F15 | Panel samoobsługi (FAQ) | TC-14, TC-21 | ✓ Pełne |
| F16 | Edycja odpowiedzi | TC-22 | ✓ Pełne |
| F17 | Załączniki (klient i agent) | TC-23, TC-24 | ✓ Pełne |
| F18 | Automatyzacja (szablony, FAQ) | TC-21, TC-25 | ✓ Pełne |
| F19 | Integracje (CRM, Teams) | TC-11 | ◐ Częściowe |
| F20 | Zarządzanie zmianami (ITIL) | TC-29, TC-30 | ✓ Pełne |
| F21 | Archiwizacja zgłoszeń | TC-31 | ✓ Pełne |
| F22 | Wsparcie AI, analiza nastroju | TC-18 | ◐ Częściowe |
| F23 | Szablony, powiadomienia email | TC-25, TC-26, TC-27, TC-28 | ✓ Pełne |
| F24 | Integracja IMAP/Exchange | TC-10, TC-35 | ✓ Pełne |

#### Wymagania niefunkcjonalne (NF1–NF11)

| Wymaganie | Opis | Przypadki testowe |
|-----------|------|-------------------|
| NF1 | Automatyczny audyt | TC-38 |
| NF2 | Responsywność (RWD) | TC-39 |
| NF3 | Czas odpowiedzi < 2s | TC-40 |
| NF4 | Skalowalność | TC-41 |
| NF5 | SLA 99,9%, auto-recovery | TC-42, TC-43 |
| NF6 | Monitoring i logowanie | TC-42 |
| NF7 | Szyfrowanie, MFA, RBAC | TC-36, TC-37, TC-44 |
| NF8 | Przyjazny interfejs | TC-46 |
| NF9 | RODO | TC-44 |
| NF10 | Kompatybilność przeglądarek | TC-45 |
| NF11 | Automatyczne backupy | TC-43 |

#### Wymagania architektoniczne (A1–A8)

| Wymaganie | Opis | Przypadki testowe |
|-----------|------|-------------------|
| A1 | Frontend (React) + Backend (Node.js) | TC-09, TC-40 |
| A2 | Dwa kontenery PostgreSQL (dane + logi) | TC-49 |
| A3 | MinIO (magazyn obiektów) | TC-23, TC-24, TC-48 |
| A4 | Redis (cache) | TC-47 |
| A5 | Keycloak (SSO/IAM) | TC-01, TC-02 |
| A6 | Prometheus + Grafana (monitoring) | TC-42 |
| A7 | Orkiestracja (Docker/K8s/Helm) | TC-41 |
| A8 | NGINX Ingress (TLS) | Weryfikacja wymaga wdrożenia K8s |

### 4.1.8. Wyniki testów

Uruchomienie pełnego zestawu testów:

```bash
npm test
# lub z pokryciem kodu:
npm run test:coverage
```

Skonfigurowany timeout testów: **15 sekund** na test. Testy wykonywane z flagami `--forceExit --detectOpenHandles` w celu prawidłowego zamykania połączeń asynchronicznych.

---

## 4.2. Testy wydajnościowe i niezawodności

### 4.2.1. Testy wydajności API (TC-40)

Weryfikacja wymagania **NF3 — czas odpowiedzi API poniżej 2 sekund** została zrealizowana poprzez automatyczne pomiary czasu odpowiedzi kluczowych endpointów.

**Metodologia:**
Każdy test mierzy czas od wysłania żądania HTTP do otrzymania kompletnej odpowiedzi za pomocą pomiaru `Date.now()`:

```javascript
test('GET /api/tickets odpowiada w < 2s', async () => {
  const start = Date.now()
  const res = await request(app)
    .get('/api/tickets')
    .set(authHeader(users.agent))
  const elapsed = Date.now() - start

  expect(res.status).toBe(200)
  expect(elapsed).toBeLessThan(2000)
})
```

**Testowane endpointy i wyniki:**

| Endpoint | Metoda | Opis | Próg | Wynik |
|----------|--------|------|------|-------|
| `/api/tickets/` | GET | Lista zgłoszeń (paginowana) | < 2000 ms | ✓ Pass |
| `/api/stats/dashboard` | GET | Dashboard KPI | < 2000 ms | ✓ Pass |
| `/api/tickets/search?q=test` | GET | Wyszukiwanie Elasticsearch | < 2000 ms | ✓ Pass |
| `/api/tickets/` | POST | Tworzenie zgłoszenia | < 2000 ms | ✓ Pass |
| `/api/reports/data` | GET | Dane raportowe | < 2000 ms | ✓ Pass |

### 4.2.2. Mechanizm cache — Redis (TC-47)

System wykorzystuje warstwę cache opartą na **Redis 8.0** z automatyczną invalidacją. Middleware cache działa na poziomie żądań GET HTTP:

1. **Klucz cache** generowany wg wzorca: `cache:{URL}:user:{userId}` — zapewnia izolację danych między użytkownikami.
2. **Trafienie cache (hit)**: dane zwracane bezpośrednio z Redis bez zapytania do bazy danych.
3. **Brak w cache (miss)**: zapytanie do PostgreSQL, wynik zapisywany w Redis z TTL.
4. **Invalidacja**: operacje zapisu (POST, PUT, DELETE) czyszczą powiązane klucze cache za pomocą funkcji `clearCache(pattern)`.

**Parametry TTL (Time-To-Live):**

| Zasób | TTL | Uzasadnienie |
|-------|-----|--------------|
| Lista zgłoszeń | 30s | Częste zmiany, wymaga aktualności |
| Szczegóły zgłoszenia | 60s | Rzadziej zmieniane |
| Dashboard KPI | 60s | Agregowane statystyki |

**Test cache (TC-47):**

```javascript
test('Drugie zapytanie korzysta z cache (mock Redis)', async () => {
  const redis = require('../config/redis')
  const cachedData = JSON.stringify({ tickets: [createSampleTicket()], total: 1 })
  redis.get.mockResolvedValue(cachedData)

  const res = await request(app)
    .get('/api/tickets')
    .set(authHeader(users.agent))

  expect(res.status).toBe(200)
})
```

### 4.2.3. Niezawodność — Health Check (TC-41, TC-42)

System implementuje endpoint **health check** (`GET /api/health`) sprawdzający stan trzech kluczowych zależności:

```javascript
exports.healthCheck = async (req, res) => {
  const checks = {}
  let healthy = true

  // 1. PostgreSQL — zapytanie SELECT 1
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok' }
  } catch (err) {
    checks.database = { status: 'error', message: err.message }
    healthy = false
  }

  // 2. Redis — sprawdzenie statusu połączenia i ping
  try {
    const redis = require('../config/redis')
    if (redis && redis.status === 'ready') {
      await redis.ping()
      checks.redis = { status: 'ok' }
    }
  } catch (err) {
    checks.redis = { status: 'error', message: err.message }
  }

  // 3. Elasticsearch — ping klastra
  try {
    const { esClient } = require('../config/elasticsearch')
    await esClient.ping()
    checks.elasticsearch = { status: 'ok' }
  } catch (err) {
    checks.elasticsearch = { status: 'warning', message: 'Not available' }
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'AlmaDesk-Edu Backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks
  })
}
```

**Cechy endpointu health:**
- **Nie wymaga autoryzacji** — umożliwia monitoring przez zewnętrzne narzędzia (Prometheus, Kubernetes liveness/readiness probes).
- **Status degradacji** — rozróżnia stany `ok` (HTTP 200) i `degraded` (HTTP 503).
- **Informacje diagnostyczne** — timestamp, uptime procesu, szczegółowy stan każdej usługi zależnej.

**Testy health check (TC-41):**
- Endpoint zwraca HTTP 200 z poprawną strukturą JSON.
- Nie wymaga nagłówka Authorization.
- Obsługa JSON i nagłówki CORS obecne.
- Nieistniejące endpointy zwracają HTTP 404.

### 4.2.4. Backup i przywracanie danych (TC-43)

System wyposażono w automatyczny skrypt backup (`backup.ps1`) wykonujący kopie zapasowe 4 komponentów:

| Komponent | Metoda | Dane |
|-----------|--------|------|
| **PostgreSQL (główna baza)** | `pg_dump --format=custom` | Tabele operacyjne: users, tickets, comments, attachments, tags, itp. (15+ tabel) |
| **PostgreSQL (logi)** | `pg_dump --format=custom` | Logi audytu, aktywność systemowa |
| **MinIO** | `mc mirror` (klient MinIO) | Pliki załączników użytkowników |
| **Konfiguracje** | Kopiowanie plików | docker-compose.yml, prometheus.yml, .env, almadesk-realm.json (Keycloak) |

**Parametry:**
- **Retencja**: domyślnie 30 dni (parametr `$RetentionDays`)
- **Kompresja**: archiwizacja ZIP po każdym dumpie
- **Cleanup**: automatyczne usuwanie backupów starszych niż próg retencji
- **Statystyki**: raport rozmiaru każdego pliku backupu w MB

### 4.2.5. Szyfrowanie i bezpieczeństwo danych (TC-44)

| Aspekt | Implementacja | Weryfikacja |
|--------|--------------|-------------|
| **Hasła** | bcrypt (koszt 10) | Test: hasło nie pojawia się w odpowiedziach API |
| **MFA secret** | base32 (speakeasy) | Test: pole mfaSecret nie zwracane w GET |
| **Kody zapasowe MFA** | bcrypt (jednorazowe) | Test: po użyciu usuwane z tablicy |
| **JWT payload** | Minimalne dane: `{id, login, role}` | Test: brak password, email, firstName, mfaSecret w tokenie |
| **SystemSettings** | Flaga `isSecret=true` ukrywa wartości wrażliwe | Test: API nie zwraca wrażliwych ustawień |

---

## 4.3. Walidacja wymagań użytkowników

### 4.3.1. Metodyka walidacji

Walidacja wymagań użytkowników oparta została na trzech filarach:

1. **Pokrycie wymagań testami** — macierz śledzenia (traceability matrix) mapująca każde wymaganie na konkretne przypadki testowe.
2. **Weryfikacja przepływów użytkownika** — scenariusze testowe odzwierciedlające rzeczywiste procesy pracy helpdesku uczelnianego.
3. **Kontrola ograniczeń ról** — systematyczne testowanie granic uprawnień dla 4 ról systemowych.

### 4.3.2. Role i persony użytkowników

System definiuje 4 role w oparciu o model RBAC:

| Rola | Persona testowa | Uprawnienia kluczowe |
|------|----------------|---------------------|
| **KLIENT** | Jan Kowalski (student/pracownik) | Tworzenie zgłoszeń, przeglądanie własnej historii, ocena jakości, baza wiedzy, zamykanie/reopen własnych zgłoszeń |
| **AGENT** | Anna Nowak (agent IT) | Obsługa zgłoszeń, komentarze (publiczne i wewnętrzne), raporty, rejestracja w imieniu klienta, zarządzanie tagami (bez usuwania) |
| **ADMIN** | Piotr Wiśniewski (administrator) | Zarządzanie użytkownikami, zmiana ról, wyzwalanie analizy alertów, konfiguracja systemu |
| **SUPER_ADMIN** | Marek Zieliński (super-administrator) | Pełny dostęp: audyt, usuwanie tagów/użytkowników, konfiguracja SSO, zarządzanie systemowe |

### 4.3.3. Walidacja wymagań funkcjonalnych — scenariusze użytkownika

#### Scenariusz 1: Wielokanałowa rejestracja zgłoszenia (F7)

System obsługuje 6 źródeł zgłoszeń, zweryfikowanych testami:

| Źródło | Kanał | Test | Wynik |
|--------|-------|------|-------|
| `PORTAL` | Panel klienta (www) | TC-09 | ✓ |
| `EMAIL` | IMAP polling | TC-10 | ✓ |
| `PHONE` | Rejestracja przez agenta | TC-11 | ✓ |
| `CHAT` | Rejestracja przez agenta | TC-11 | ✓ |
| `WALK_IN` | Rejestracja przez agenta | TC-11 | ✓ |
| `TEAMS` | Rejestracja przez agenta | TC-11 | ✓ |

#### Scenariusz 2: Cykl życia zgłoszenia (F8)

Pełny workflow zgłoszenia od utworzenia do archiwizacji:

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED → [Archiwizacja]
                   ↕              ↕
               PENDING          reopen → OPEN
               ON_HOLD
```

Każde przejście statusu generuje:
- Wpis w logu audytu (`STATUS_CHANGE`)
- Reindeksację w Elasticsearch
- Powiadomienie email do autora zgłoszenia
- Invalidację cache Redis

#### Scenariusz 3: Panel samoobsługi klienta (F9, F15)

Zweryfikowane elementy portalu klienckiego:
- Lista „Moje zgłoszenia" z filtrami statusu i priorytetu
- Baza wiedzy (FAQ) — tylko artykuły PUBLISHED, licznik wyświetleń, feedback
- Ocena jakości obsługi (1–5 gwiazdek) dla zgłoszeń CLOSED
- Ograniczenie: KLIENT nie widzi komentarzy wewnętrznych agentów

#### Scenariusz 4: Zarządzanie zmianami ITIL (F20)

Zweryfikowany workflow Change Request obejmujący 11 statusów:

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SCHEDULED → IN_PROGRESS
                                  ↓                                ↓
                              REJECTED                      IMPLEMENTED
                                                                ↓
                                                            VERIFIED → CLOSED
                                                                ↓
                                                            CANCELLED
```

Stany terminalne (REJECTED, CANCELLED) uniemożliwiają dalsze zmiany statusu. Każda zmiana rejestrowana w `ChangeAuditLog` z adresem IP i nagłówkiem user-agent.

### 4.3.4. Walidacja wymagań niefunkcjonalnych

| Wymaganie | Metryka | Sposób weryfikacji | Wynik |
|-----------|---------|-------------------|-------|
| **NF1** — Audyt | Każda krytyczna operacja logowana | TC-38: paginacja, filtrowanie, lista akcji | ✓ |
| **NF3** — Wydajność | Czas odpowiedzi < 2s | TC-40: pomiar 5 endpointów | ✓ |
| **NF4** — Skalowalność | Docker Compose, 9 kontenerów | TC-41: health check, sieć bridge | ✓ |
| **NF5** — SLA 99,9% | Health check, monitoring, backup | TC-42, TC-43: auto-recovery, retencja 30 dni | ✓ |
| **NF7** — Bezpieczeństwo | bcrypt, MFA/TOTP, RBAC, JWT min | TC-36, TC-37, TC-44: testy penetracyjne ról | ✓ |
| **NF9** — RODO | Minimalizacja danych w JWT, haszowanie | TC-44: brak wrażliwych danych w odpowiedziach | ✓ |
| **NF11** — Backupy | 4 komponenty, retencja, kompresja | TC-43: pg_dump, mc mirror, ZIP | ✓ |

### 4.3.5. Podsumowanie pokrycia wymagań

| Kategoria | Liczba wymagań | Pokrytych w pełni | Pokrytych częściowo | Brak pokrycia |
|-----------|---------------|-------------------|---------------------|---------------|
| Funkcjonalne (F) | 24 | 22 | 2 (F19, F22) | 0 |
| Niefunkcjonalne (NF) | 11 | 11 | 0 | 0 |
| Architektoniczne (A) | 8 | 7 | 0 | 1 (A8 — wymaga K8s) |
| **Razem** | **43** | **40** | **2** | **1** |

**Pokrycie wymagań: 93% pełne, 5% częściowe, 2% wymaga wdrożenia produkcyjnego.**

---

## 4.4. Monitoring działania systemu

### 4.4.1. Architektura monitoringu

System AlmaDesk-Edu implementuje monitoring oparty na stosie **Prometheus + Grafana**, uzupełniony o wewnętrzny health check i automatyczny audyt.

```
┌──────────────────────────────────────────────────────────────────┐
│                        WARSTWA PREZENTACJI                        │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │               Grafana (port 3000)                          │ │
│   │   Dashboardy: metryki systemu, alerty, wizualizacje        │ │
│   └────────────────────────────────────────────────────────────┘ │
│                              ▲                                   │
│                              │ zapytania PromQL                  │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │             Prometheus (port 9090)                          │ │
│   │   Scraping co 15s, retencja 30 dni, 8 celów                │ │
│   └──────┬─────┬──────┬──────┬──────┬──────┬──────┬──────┬─────┘ │
│          │     │      │      │      │      │      │      │       │
│          ▼     ▼      ▼      ▼      ▼      ▼      ▼      ▼       │
│       Backend Redis  PG   PG-Logs  ES  Keycloak MinIO  Prom     │
│       :3001  :6379 :5432  :5433  :9200  :8080  :9000  :9090     │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4.2. Konfiguracja Prometheus

Prometheus zbiera metryki z 8 celów (targets) skonfigurowanych w `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'almadesk-edu'
    environment: 'development'
```

| Job | Target | Metrics path | Opis |
|-----|--------|-------------|------|
| `prometheus` | `localhost:9090` | `/metrics` | Metryki wewnętrzne Prometheus |
| `almadesk-backend` | `host.docker.internal:3001` | `/api/metrics` | Metryki aplikacyjne (prom-client) |
| `postgres` | `postgres:5432` | — | Metryki głównej bazy danych |
| `postgres-logs` | `postgres_logs:5432` | — | Metryki bazy logów |
| `redis` | `redis:6379` | — | Metryki cache Redis |
| `elasticsearch` | `elasticsearch:9200` | `/_prometheus/metrics` | Metryki wyszukiwarki |
| `keycloak` | `keycloak:8080` | `/metrics` | Metryki IAM/SSO |
| `minio` | `minio:9000` | `/minio/v2/metrics/cluster` | Metryki magazynu obiektów |

**Parametry operacyjne:**
- **Interwał scrapingu**: 15 sekund
- **Retencja danych**: 30 dni (`--storage.tsdb.retention.time=30d`)
- **Przechowywanie**: wolumen `prometheus_data` (Docker volume)

### 4.4.3. Metryki backendu — prom-client

Backend eksponuje metryki na endpoincie `/api/metrics` za pomocą biblioteki **prom-client** (v15.1.0). Zbierane metryki obejmują:

| Typ metryki | Nazwa | Opis |
|-------------|-------|------|
| Counter | `http_requests_total` | Łączna liczba żądań HTTP (wg metody, ścieżki, kodu statusu) |
| Histogram | `http_request_duration_seconds` | Czas trwania żądań HTTP (percentyle: p50, p90, p99) |
| Gauge | `nodejs_active_handles_total` | Aktywne uchwyty procesu Node.js |
| Gauge | `nodejs_heap_size_used_bytes` | Użycie pamięci sterty |
| Summary | `process_cpu_seconds_total` | Zużycie CPU procesu |
| Gauge | Domyślne metryki Node.js | Event loop lag, GC, pamięć RSS |

### 4.4.4. Grafana — wizualizacja

Grafana (port 3000) stanowi warstwę prezentacji danych z Prometheus. Konfiguracja:

- **Źródło danych**: Prometheus (adres: `http://prometheus:9090`)
- **Autentykacja**: Domyślny admin (zmiana hasła wymagana przy produkcji)
- **Health check**: `/api/health` (interwał 30s)

Dashboardy Grafana umożliwiają monitorowanie:
- Obciążenia API (req/s, latencja, kody odpowiedzi)
- Wydajności bazy danych (zapytania/s, lock waits)
- Stanu cache Redis (hit/miss ratio, pamięć)
- Stanu Elasticsearch (indeksowanie, wyszukiwanie, pamięć JVM)
- Dostępności Keycloak (sesje, logowania SSO)
- Wykorzystania MinIO (obiekty, przestrzeń dyskowa)

### 4.4.5. Health check — monitorowanie wewnętrzne

Wewnętrzny health check (`GET /api/health`) pełni podwójną rolę:

1. **Kubernetes Probes** — endpoint wykorzystywany jako liveness i readiness probe w konfiguracji Helm:

```yaml
backend:
  port: 3001
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

2. **Docker Health Checks** — każdy kontener w `docker-compose.yml` posiada skonfigurowany health check:

| Kontener | Komenda Health Check | Interwał | Timeout | Retries |
|----------|---------------------|----------|---------|---------|
| PostgreSQL | `pg_isready -U almadesk` | 10s | 5s | 5 |
| Redis | `redis-cli ping` | 10s | 5s | 5 |
| Elasticsearch | `curl -f http://localhost:9200/_cluster/health` | 30s | 10s | 5 |
| Keycloak | `curl -f http://localhost:8080/health/ready` | 30s | 10s | 5 (start: 60s) |
| MinIO | `curl -f http://localhost:9000/minio/health/live` | 30s | 10s | 3 |
| Prometheus | `wget --spider http://localhost:9090/-/healthy` | 30s | 10s | 3 |
| Grafana | `wget --spider http://localhost:3000/api/health` | 30s | 10s | 3 |

Polityka `restart: unless-stopped` zapewnia automatyczne odtwarzanie kontenerów po awarii.

### 4.4.6. Log audytu — monitorowanie aktywności

System rejestruje automatycznie każdą istotną operację w dedykowanej tabeli `AuditLog`:

| Pole | Typ | Opis |
|------|-----|------|
| `action` | String | Typ operacji (np. LOGIN, CREATE_TICKET, STATUS_CHANGE) |
| `entityType` | String | Typ encji (User, Ticket, Comment) |
| `entityId` | String | Identyfikator encji |
| `userId` | Int | Identyfikator użytkownika wykonującego operację |
| `ipAddress` | String | Adres IP klienta |
| `userAgent` | String | Nagłówek User-Agent przeglądarki |
| `changes` | JSON | Szczegóły zmian (zależne od operacji) |
| `createdAt` | DateTime | Data i czas operacji |

**Rejestrowane operacje:**
`LOGIN`, `LOGIN_SSO`, `CREATE_TICKET`, `STATUS_CHANGE`, `ASSIGN_TICKET`, `CREATE_COMMENT`, `CREATE_INTERNAL_COMMENT`, `UPDATE_USER`, `DELETE_USER`, `MFA_ENABLED`, `ARCHIVE_TICKET`, `RESTORE_TICKET`, `ACKNOWLEDGE_ALERT`, `RESOLVE_ALERT`

Logi audytu przechowywane są w **oddzielnej instancji PostgreSQL** (port 5433, kontener `almadesk_postgres_logs`), co zapewnia:
- Separację logów od danych operacyjnych (brak wpływu na wydajność)
- Niezależny backup i rotację
- Izolację w przypadku ataku na główną bazę

### 4.4.7. Infrastruktura kontenerowa

System działa na **9 kontenerach Docker** połączonych siecią bridge `almadesk_network`:

| Kontener | Obraz | Port(y) | Rola |
|----------|-------|---------|------|
| `almadesk_postgres` | postgres:17.2-alpine | 5432 | Główna baza danych |
| `almadesk_postgres_logs` | postgres:17.2-alpine | 5433 | Baza logów audytu |
| `almadesk_redis` | redis:8.0-M02-alpine | 6379 | Cache i sesje |
| `almadesk_elasticsearch` | elasticsearch:8.11.3 | 9200, 9300 | Wyszukiwanie pełnotekstowe |
| `almadesk_keycloak` | keycloak:23.0 | 8080 | SSO / IAM |
| `almadesk_minio` | minio:latest | 9000, 9001 | Magazyn obiektów (załączniki) |
| `almadesk_pgadmin` | pgadmin4:latest | 5050 | Administracja SQL (dev) |
| `almadesk_prometheus` | prometheus:latest | 9090 | Zbieranie metryk |
| `almadesk_grafana` | grafana:latest | 3000 | Wizualizacja metryk |

**Wolumeny trwałe (persistent volumes):**
Każdy kontener przechowujący dane posiada dedykowany wolumen Docker: `postgres_data`, `postgres_logs_data`, `elasticsearch_data`, `redis_data`, `keycloak_data`, `minio_data`, `prometheus_data`, `grafana_data`, `pgadmin_data`.

### 4.4.8. Gotowość produkcyjna — Kubernetes i Helm

Dla wdrożenia produkcyjnego przygotowano konfigurację **Helm Chart** (`infra/helm/almadesk/`):

```yaml
apiVersion: v2
name: almadesk
description: AlmaDesk-Edu — akademicki system helpdesk ITSM
version: 1.0.0
appVersion: "1.0.0"
```

**Konfiguracja zasobów (values.yaml):**

| Komponent | CPU (request/limit) | Pamięć (request/limit) | Storage |
|-----------|---------------------|------------------------|---------|
| Backend | 100m / 500m | 256Mi / 512Mi | — |
| Frontend | 50m / 200m | 64Mi / 128Mi | — |
| PostgreSQL | — | — | 10Gi |
| PostgreSQL (logi) | — | — | 5Gi |
| Redis | — | — | 2Gi |
| Elasticsearch | — | — | 10Gi (JVM: 512m) |
| Keycloak | — | — | 1Gi |
| MinIO | — | — | 20Gi |
| Prometheus | — | — | 10Gi (retencja 30d) |
| Grafana | — | — | 5Gi |

**Ingress NGINX:**

```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: almadesk.local
      paths:
        - path: /        → frontend (port 80)
        - path: /api     → backend (port 3001)
        - path: /auth    → keycloak (port 8080)
```

### 4.4.9. Podsumowanie mechanizmów monitoringu

| Warstwa | Narzędzie | Częstotliwość | Zakres |
|---------|-----------|---------------|--------|
| **Metryki infrastruktury** | Prometheus | Co 15s | 8 celów: backend, PostgreSQL ×2, Redis, ES, Keycloak, MinIO, Prometheus |
| **Wizualizacja** | Grafana | Czas rzeczywisty | Dashboardy: obciążenie, latencja, pamięć, dysk |
| **Health check** | Wbudowany endpoint | Na żądanie / Docker 10-30s | PostgreSQL, Redis, Elasticsearch |
| **Audyt operacji** | AuditLog (oddzielna baza) | Każda operacja | 14+ typów operacji, pełne metadane (IP, UA) |
| **Backup** | backup.ps1 (PowerShell) | Harmonogram (np. codziennie) | 4 komponenty: PG ×2, MinIO, konfiguracje; retencja 30 dni |
| **Auto-recovery** | Docker restart policy | Automatycznie | `unless-stopped` dla wszystkich kontenerów |
| **Alerty nawracające** | Wbudowany scheduler | Codziennie o 2:00 | Algorytm Jaccarda, severity, powiadomienia email |
