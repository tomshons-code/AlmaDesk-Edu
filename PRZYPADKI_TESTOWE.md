# Przypadki testowe — AlmaDesk-Edu

**Projekt:** AlmaDesk-Edu — System Helpdesk dla uczelni wyższej  
**Data:** 24.02.2026  
**Liczba przypadków testowych:** 50  

> Przypadki testowe zostały opracowane w celu weryfikacji wymagań funkcjonalnych (F1–F24), niefunkcjonalnych (NF1–NF11) oraz poprawności architektury systemu (A1–A8).

---

## Legenda

| Skrót | Znaczenie |
|-------|-----------|
| **F** | Wymaganie funkcjonalne |
| **NF** | Wymaganie niefunkcjonalne |
| **A** | Wymaganie architektoniczne |
| **KLIENT** | Użytkownik końcowy (student/pracownik) |
| **AGENT** | Agent obsługi zgłoszeń |
| **ADMIN** | Administrator |
| **SUPER_ADMIN** | Superadministrator |
| **SSO** | Single Sign-On |

---

## TC-01 — Logowanie SSO przez Azure AD

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F1, A5 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | Keycloak skonfigurowany z providerem Azure AD; użytkownik posiada konto w Azure AD uczelni |
| **Kroki** | 1. Otwórz stronę logowania AlmaDesk-Edu. 2. Kliknij przycisk „Zaloguj przez Microsoft". 3. Uwierzytelnij się w Azure AD (email + hasło + ewentualna weryfikacja MFA po stronie Azure). 4. Zaczekaj na przekierowanie zwrotne do aplikacji. |
| **Oczekiwany rezultat** | Użytkownik zostaje zalogowany, przekierowany na dashboard odpowiedni do swojej roli. W bazie danych tworzony jest nowy rekord użytkownika (jeśli pierwsze logowanie) z rolą wynikającą z konfiguracji Keycloak. Token JWT jest przechowywany w localStorage. |
| **Pokrycie** | SSO OIDC, Keycloak → Azure AD, automatyczne tworzenie konta, mapowanie ról |

---

## TC-02 — Logowanie SSO przez Google / GitHub / GitLab

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F1 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Keycloak skonfigurowany z odpowiednimi providerami SSO; providery włączone w SystemSettings |
| **Kroki** | 1. Otwórz stronę logowania. 2. Kliknij przycisk wybranego providera SSO (Google/GitHub/GitLab). 3. Uwierzytelnij się u zewnętrznego dostawcy. 4. Zaczekaj na przekierowanie do `/auth/callback`. |
| **Oczekiwany rezultat** | Pomyślne logowanie. Dla nowego użytkownika tworzony jest rekord z rolą KLIENT. Dla istniejącego — rola NIE jest nadpisywana (zachowuje aktualną rolę z bazy). |
| **Pokrycie** | Wielu providerów SSO, zachowanie roli istniejących użytkowników |

---

## TC-03 — Automatyczna identyfikacja agenta — podpis w stopce

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F2 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Agent zalogowany; agent ma ustawiony podpis w Ustawienia → Konto → „Podpis agenta" |
| **Kroki** | 1. Zaloguj się jako AGENT. 2. Otwórz istniejące zgłoszenie. 3. Napisz odpowiedź publiczną (nie wewnętrzną) i kliknij „Wyślij". 4. Sprawdź treść dodanego komentarza. |
| **Oczekiwany rezultat** | Treść odpowiedzi zawiera na końcu automatycznie dołączony podpis agenta (separator `---` + treść z pola `agentSignature`). Podpis NIE jest dodawany do komentarzy wewnętrznych. |
| **Pokrycie** | Automatyczny podpis agenta, rozróżnienie komentarzy publicznych i wewnętrznych |

---

## TC-04 — Tworzenie nowego klienta z poziomu zgłoszenia

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F3 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Agent zalogowany; zgłoszenie telefoniczne od osoby nie posiadającej konta |
| **Kroki** | 1. Zaloguj się jako AGENT. 2. Otwórz widok rejestracji zgłoszenia na rzecz klienta (POST `/tickets/register`). 3. Podaj email i imię nowej osoby. 4. System automatycznie tworzy konto klienta (login = prefiks email). |
| **Oczekiwany rezultat** | Nowy użytkownik z rolą KLIENT zostaje utworzony w bazie. Zgłoszenie jest przypisane do nowo utworzonego klienta. Login generowany jest automatycznie z prefiksu adresu email. |
| **Pokrycie** | Szybkie tworzenie klienta (quick-create), powiązanie z zgłoszeniem |

---

## TC-05 — Wyszukiwanie zgłoszeń po tagu

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F4 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Istnieją zgłoszenia z przypisanymi tagami; zalogowany użytkownik AGENT |
| **Kroki** | 1. Przejdź do kolejki zgłoszeń. 2. W filtrze „Tagi" wybierz jeden lub więcej tagów z listy rozwijanej. 3. Zatwierdź filtrowanie. |
| **Oczekiwany rezultat** | Lista zgłoszeń wyświetla wyłącznie te, które posiadają przynajmniej jeden z wybranych tagów. Zapytanie API zawiera parametr `tags` z ID wybranych tagów (rozdzielone przecinkami). |
| **Pokrycie** | Filtrowanie po tagach, relacja many-to-many TicketTag |

---

## TC-06 — Wyszukiwanie pełnotekstowe zgłoszeń (Elasticsearch)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F5 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Elasticsearch uruchomiony; zgłoszenia zaindeksowane |
| **Kroki** | 1. Przejdź do kolejki zgłoszeń. 2. Wpisz frazę w pole wyszukiwania (np. „drukarka nie działa"). 3. Zaobserwuj wyniki na bieżąco. |
| **Oczekiwany rezultat** | Wyniki wyszukiwania zawierają zgłoszenia pasujące po tytule (waga 5×) lub opisie (waga 2×). Obsługa fuzzy matching (literówki), dopasowanie frazy dokładnej, wyszukiwanie po ID (`#123`). Wyniki zawierają podświetlenie (`<mark>`) dopasowanych fragmentów. |
| **Pokrycie** | Elasticsearch, indeksowanie, fuzzy search, highlighting, wagi pól |

---

## TC-07 — Dashboard KPI dostosowany do roli KLIENT

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F6 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Zalogowany jako KLIENT z kilkoma zgłoszeniami o różnych statusach |
| **Kroki** | 1. Zaloguj się jako KLIENT. 2. Przejdź na stronę główną (dashboard). |
| **Oczekiwany rezultat** | Dashboard wyświetla: łączna liczba zgłoszeń, otwarte, w trakcie, rozwiązane, zamknięte, zgłoszenia z ostatnich 7 dni, podział wg priorytetu (low/medium/high/critical), podział wg kategorii. NIE widać statystyk agentów, zgłoszeń nieprzypisanych ani czasu rozwiązywania. |
| **Pokrycie** | Filtrowanie KPI wg roli, ograniczenie widoczności danych |

---

## TC-08 — Dashboard KPI dostosowany do roli AGENT/ADMIN

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F6 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Zalogowany jako AGENT lub SUPER_ADMIN |
| **Kroki** | 1. Zaloguj się jako AGENT. 2. Przejdź na dashboard. |
| **Oczekiwany rezultat** | Dashboard wyświetla rozszerzone KPI: wszystkie wskaźniki KLIENTA + zgłoszenia oczekujące (pending), przypisane do mnie, nieprzypisane, średni czas rozwiązywania (w godzinach), utworzone dziś, rozwiązane dziś, priorytet eskalowany. |
| **Pokrycie** | Rozszerzony dashboard agenta, makro-wskaźniki operacyjne |

---

## TC-09 — Rejestracja zgłoszenia z portalu klienckiego

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F7 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | KLIENT zalogowany |
| **Kroki** | 1. Zaloguj się jako KLIENT. 2. Kliknij „Nowe zgłoszenie" na portalu. 3. Wypełnij tytuł, opis, kategorię. Opcjonalnie dodaj lokalizację, wydział, laboratorium. 4. Wyślij zgłoszenie. |
| **Oczekiwany rezultat** | Zgłoszenie utworzone ze statusem OPEN, priorytetem MEDIUM, źródłem PORTAL. Powiadomienie email wysłane do wszystkich agentów. Zgłoszenie zindeksowane w Elasticsearch. Cache wyczyszczony. Wpis w logu audytu (CREATE_TICKET). |
| **Pokrycie** | Kanał: portal kliencki, domyślne wartości, powiadomienia, indeksowanie, audyt |

---

## TC-10 — Rejestracja zgłoszenia kanałem email (IMAP)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F7, F24 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Konfiguracja IMAP aktywna w SystemSettings; skrzynka pocztowa monitorowana przez system |
| **Kroki** | 1. Wyślij email na skonfigurowany adres helpdesk. 2. Zaczekaj na cykl pollingu IMAP (co N minut zgodnie z `imap_poll_interval`). |
| **Oczekiwany rezultat** | System pobiera nieprzeczytaną wiadomość, tworzy zgłoszenie: tytuł = temat emaila, opis = treść, źródło = EMAIL, priorytet = MEDIUM, kategoria = OTHER, status = OPEN. Jeśli nadawca istnieje w bazie — przypisuje zgłoszenie do niego. Jeśli nie — przypisuje do pierwszego SUPER_ADMIN/ADMIN. Wiadomość pozostaje na skrzynce pocztowej (opcja `imap_leave_on_server`). |
| **Pokrycie** | Kanał: email, IMAP polling, matchowanie użytkowników, zachowanie wiadomości |

---

## TC-11 — Rejestracja zgłoszenia przez agenta w imieniu klienta (telefon/czat)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F7, F3 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT zalogowany |
| **Kroki** | 1. Otwórz formularz rejestracji zgłoszenia (POST `/tickets/register`). 2. Wybierz źródło: PHONE, CHAT, WALK_IN lub TEAMS. 3. Wskaż istniejącego klienta lub utwórz nowego (quick-create). 4. Wypełnij szczegóły zgłoszenia i zapisz. |
| **Oczekiwany rezultat** | Zgłoszenie utworzone z wybranym źródłem (PHONE/CHAT/WALK_IN/TEAMS). `createdById` wskazuje na klienta. Agent jest automatycznie przypisany jako obsługujący. Próba podania źródła PORTAL jest odrzucana (walidacja). |
| **Pokrycie** | Kanały: telefon, czat, walk-in, Teams; rejestracja w imieniu klienta |

---

## TC-12 — Zarządzanie stanami zgłoszenia

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F8 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | Zgłoszenie w statusie OPEN; AGENT zalogowany |
| **Kroki** | 1. Zmień status zgłoszenia na IN_PROGRESS. 2. Zmień status na RESOLVED. 3. Sprawdź czy `resolvedAt` zostało ustawione. 4. Zmień status na CLOSED. |
| **Oczekiwany rezultat** | Każda zmiana statusu: zapisana w bazie, powiadomienie email do autora zgłoszenia, reindeksacja w Elasticsearch, wpis w logu audytu (STATUS_CHANGE). Pole `resolvedAt` ustawiane automatycznie przy RESOLVED. Dostępne stany: OPEN, IN_PROGRESS, RESOLVED, CLOSED, PENDING, ON_HOLD. |
| **Pokrycie** | Przepływ stanów, automatyczne daty, powiadomienia, audyt |

---

## TC-13 — Zarządzanie priorytetami zgłoszeń

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F8 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT zalogowany, istniejące zgłoszenie |
| **Kroki** | 1. Otwórz szczegóły zgłoszenia. 2. Zmień priorytet na każdy z dostępnych: LOW, MEDIUM, HIGH, CRITICAL, ESCALATED. 3. Zapisz zmianę za każdym razem. |
| **Oczekiwany rezultat** | Priorytet zmieniony pomyślnie. Zmiana widoczna na liście zgłoszeń i w szczegółach. Każdy z 5 priorytetów jest obsługiwany. |
| **Pokrycie** | Priorytety: LOW, MEDIUM, HIGH, CRITICAL, ESCALATED |

---

## TC-14 — Historia i status zgłoszeń w panelu klienta

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F9, F15 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | KLIENT zalogowany z historią zgłoszeń w różnych statusach |
| **Kroki** | 1. Zaloguj się jako KLIENT. 2. Przejdź do „Moje zgłoszenia". 3. Zweryfikuj widoczność wszystkich swoich zgłoszeń z ich statusami. 4. Kliknij na zgłoszenie w statusie CLOSED. 5. Oceń obsługę (1–5 gwiazdek + komentarz). |
| **Oczekiwany rezultat** | Lista „Moje zgłoszenia" przechowuje wszystkie zgłoszenia klienta z aktualnym statusem i priorytetem. Ocena dostępna tylko dla zamkniętych zgłoszeń (CLOSED). Ocena zapisywana: `rating` (1–5), `ratingComment`, `ratedAt`. Komentarze wewnętrzne NIE SĄ widoczne dla klienta. |
| **Pokrycie** | Panel klienta, historia zgłoszeń, ocena jakości, ukrywanie komentarzy wewnętrznych |

---

## TC-15 — Moduł raportowania — generowanie PDF

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F10, F11 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT lub ADMIN zalogowany; istnieją zgłoszenia z ostatniego miesiąca |
| **Kroki** | 1. Przejdź do modułu „Raporty". 2. Ustaw zakres dat oraz opcjonalne filtry (status, priorytet, kategoria, agent). 3. Kliknij „Eksport PDF". |
| **Oczekiwany rezultat** | Pobrany plik PDF (format A4) zawierający: kolorowe kafelki ze statystykami (wg statusu, priorytetu, kategorii), średni czas rozwiązywania, tabelę zgłoszeń (max 40 wierszy). Polskie etykiety: „Nowe", „W trakcie", „Rozwiązane", „Zamknięte". |
| **Pokrycie** | Raport PDF, filtrowanie, polskie tłumaczenia, limity wierszy |

---

## TC-16 — Moduł raportowania — generowanie Excel

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F10, F11 |
| **Priorytet** | Średni |
| **Warunki wstępne** | AGENT lub ADMIN zalogowany |
| **Kroki** | 1. Przejdź do modułu „Raporty". 2. Ustaw filtry i kliknij „Eksport Excel". |
| **Oczekiwany rezultat** | Pobrany plik .xlsx z dwoma arkuszami: „Podsumowanie" (statystyki zbiorcze) i „Zgłoszenia" (szczegółowa tabela). Autofiltr włączony, nagłówek zamrożony. |
| **Pokrycie** | Raport Excel, arkusze, autofiltr |

---

## TC-17 — Automatyczne raporty miesięczne/kwartalne na email

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F11 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Konfiguracja scheduled_reports aktywna w SystemSettings: `sr_enabled=true`, `sr_frequency=both`, `sr_recipients` ustawiony |
| **Kroki** | 1. W panelu administracyjnym włącz automatyczne raporty. 2. Ustaw częstotliwość: „monthly + quarterly". 3. Wpisz adresy email odbiorców (np. rektor@uczelnia.pl). 4. Opcjonalnie wyzwól raport ręcznie przyciskiem „Wyślij teraz" (triggerNow). |
| **Oczekiwany rezultat** | System wysyła raporty PDF na wskazane adresy email: co 1. dnia miesiąca (monthly) oraz 1. dnia kwartału (quarterly — styczeń, kwiecień, lipiec, październik), o skonfigurowanej godzinie. Raport zawiera statystyki z danego okresu. |
| **Pokrycie** | Scheduler, automatyczne raporty, email, konfiguracja z SystemSettings |

---

## TC-18 — Alerty o nawracających problemach

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F12 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Analiza cykliczna uruchomiona (scheduler działa, codziennie o 2:00) |
| **Kroki** | 1. Utwórz co najmniej 3 zgłoszenia z podobnymi tytułami w tej samej kategorii w ciągu 30 dni. 2. Zaczekaj na cykl analizy lub wyzwól ręcznie (POST `/recurring-alerts/analyze`). 3. Przejdź do widoku alertów nawracających. |
| **Oczekiwany rezultat** | System wykrywa wzorzec powtarzalności (algorytm Jaccarda, próg ≥0.7). Tworzy alert z wyliczoną wagą: ≥10 wystąpień lub ≥5 użytkowników → CRITICAL, ≥6/≥3 → HIGH, ≥4/≥2 → MEDIUM, pozostałe → LOW. Alert zawiera sugerowaną akcję (FAQ, sprawdzenie sprzętu, aktualizacja software). Alerty CRITICAL wysyłają powiadomienie email do administratorów. |
| **Pokrycie** | Automatyczna detekcja wzorców, severity, sugestie, powiadomienia krytyczne |

---

## TC-19 — Komentarze wewnętrzne między agentami

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F13 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT zalogowany; istniejące zgłoszenie |
| **Kroki** | 1. Otwórz szczegóły zgłoszenia jako AGENT. 2. Napisz komentarz z zaznaczoną opcją „Wewnętrzny". 3. Wyślij komentarz. 4. Zaloguj się jako KLIENT (autor zgłoszenia). 5. Otwórz to samo zgłoszenie i sprawdź komentarze. |
| **Oczekiwany rezultat** | Komentarz wewnętrzny zapisany z flagą `isInternal=true`. Widoczny tylko dla AGENT/ADMIN/SUPER_ADMIN — KLIENT NIE widzi tego komentarza. Powiadomienie email o komentarzu wewnętrznym wysyłane do WSZYSTKICH agentów (nie do klienta). Podpis agenta NIE jest dodawany do komentarzy wewnętrznych. Log audytu: CREATE_INTERNAL_COMMENT. |
| **Pokrycie** | Komentarze wewnętrzne, ukrywanie przed klientem, powiadomienia agentów |

---

## TC-20 — Filtrowanie zgłoszeń wg wydziału, lokalizacji, laboratorium

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F14 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Istnieją zgłoszenia z wypełnionymi polami: location, department, laboratory |
| **Kroki** | 1. Przejdź do kolejki zgłoszeń jako AGENT. 2. Rozwiń filtr „Lokalizacja" i wybierz wartość. 3. Rozwiń filtr „Wydział" i wybierz wartość. 4. Rozwiń filtr „Laboratorium" i wybierz wartość. |
| **Oczekiwany rezultat** | Lista zgłoszeń wyświetla tylko rekordy pasujące do wybranych filtrów. Filtrowanie po backendu używa `contains` + `insensitive` (case-insensitive). Wartości w filtrach są dynamicznie wyodrębniane z istniejących zgłoszeń. |
| **Pokrycie** | Filtry: wydział, lokalizacja, laboratorium; wyszukiwanie case-insensitive |

---

## TC-21 — Panel samoobsługi — baza wiedzy (FAQ)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F15, F18 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Opublikowane artykuły w bazie wiedzy (status=PUBLISHED) |
| **Kroki** | 1. Zaloguj się jako KLIENT. 2. Przejdź do sekcji „Baza wiedzy". 3. Przeglądaj foldery i artykuły. 4. Kliknij artykuł i sprawdź treść. 5. Oznacz artykuł jako „Pomocny" lub „Niepomocny". |
| **Oczekiwany rezultat** | KLIENT widzi TYLKO opublikowane artykuły (status=PUBLISHED). Artykuły robocze (DRAFT) i zarchiwizowane (ARCHIVED) nie są widoczne. Każde wyświetlenie zwiększa `viewCount`. Feedback zapisuje się w `helpfulCount`/`notHelpfulCount`. Struktura folderów (isFolder + parentId) zachowana. |
| **Pokrycie** | Self-service, baza wiedzy, filtrowanie wg statusu, feedback, hierarchia folderów |

---

## TC-22 — Edycja odpowiedzi (komentarza)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F16 |
| **Priorytet** | Średni |
| **Warunki wstępne** | AGENT zalogowany; istnieje komentarz napisany przez niego |
| **Kroki** | 1. Otwórz zgłoszenie z komentarzem. 2. Kliknij „Edytuj" przy swoim komentarzu. 3. Zmień treść i zapisz. |
| **Oczekiwany rezultat** | Treść komentarza zaktualizowana. Flaga `isEdited` ustawiona na `true`. Pole `updatedAt` zmienione. Autor komentarza lub AGENT/SUPER_ADMIN mogą edytować — inni nie. |
| **Pokrycie** | Edycja komentarzy, flaga isEdited, kontrola uprawnień |

---

## TC-23 — Załączniki w odpowiedziach — strona klienta

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F17, A3 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | KLIENT zalogowany; istniejące zgłoszenie |
| **Kroki** | 1. Otwórz zgłoszenie. 2. Dołącz pliki (PDF, obraz, log) — do 5 na raz. 3. Wyślij. 4. Sprawdź listę załączników. 5. Kliknij na załącznik, aby go pobrać. |
| **Oczekiwany rezultat** | Pliki przesłane do MinIO (magazyn obiektów), rekordy w tabeli Attachment z polami: filename, originalName, mimeType, size, minioKey, minioBucket. Pobranie generuje link do MinIO. Limit: max 5 plików na raz (multer). |
| **Pokrycie** | Załączniki klienta, MinIO, upload/download, limity |

---

## TC-24 — Załączniki w odpowiedziach — strona agenta

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F17 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT zalogowany |
| **Kroki** | 1. Otwórz zgłoszenie. 2. Dołącz pliki jako AGENT. 3. Sprawdź załączniki. 4. Usuń wybrany załącznik. |
| **Oczekiwany rezultat** | Upload i download identycznie jak dla klienta. Dodatkowo: AGENT/SUPER_ADMIN może usuwać dowolne załączniki (DELETE). Klient może usunąć tylko swoje. Usunięcie → plik usuwany z MinIO + rekord z bazy. |
| **Pokrycie** | Załączniki agenta, usuwanie z kontrolą uprawnień |

---

## TC-25 — Szablony odpowiedzi

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F18, F23 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT zalogowany |
| **Kroki** | 1. Przejdź do Ustawienia → Szablony odpowiedzi. 2. Utwórz nowy szablon: podaj tytuł, treść, kategorię, oznacz jako publiczny. 3. Zapisz. 4. Otwórz zgłoszenie i wstaw szablon do odpowiedzi. |
| **Oczekiwany rezultat** | Szablon zapisany w tabeli ResponseTemplate z polami: title, content, category, isPublic, createdById. Publiczne szablony widoczne dla wszystkich agentów. Przy tworzeniu odpowiedzi na zgłoszenie — szybkie wstawienie treści szablonu. |
| **Pokrycie** | Tworzenie szablonów, wstawianie do odpowiedzi, publiczne/prywatne |

---

## TC-26 — Powiadomienia email o nowym zgłoszeniu

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F23 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | SMTP skonfigurowany w SystemSettings; istniejący agenci w systemie |
| **Kroki** | 1. Utwórz nowe zgłoszenie jako KLIENT. 2. Sprawdź skrzynki pocztowe agentów. |
| **Oczekiwany rezultat** | Email (HTML z inline CSS) wysłany do WSZYSTKICH agentów z informacją o nowym zgłoszeniu. Email zawiera tytuł, kategorię, priorytet i link do zgłoszenia. |
| **Pokrycie** | Powiadomienia email, SMTP z SystemSettings |

---

## TC-27 — Powiadomienia email o zmianie statusu

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F23 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Istniejące zgłoszenie, AGENT zalogowany |
| **Kroki** | 1. Zmień status zgłoszenia z OPEN na IN_PROGRESS. 2. Sprawdź skrzynkę pocztową autora zgłoszenia. |
| **Oczekiwany rezultat** | Email wysłany do autora zgłoszenia informujący o zmianie statusu (stary → nowy). |
| **Pokrycie** | Powiadomienia o zmianie statusu, email do klienta |

---

## TC-28 — Zapis preferencji powiadomień

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F23 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Użytkownik zalogowany |
| **Kroki** | 1. Przejdź do Ustawienia → Powiadomienia. 2. Wyłącz „Powiadomienia email" i „Nowe przypisania". 3. Kliknij „Zapisz preferencje". 4. Odśwież stronę. |
| **Oczekiwany rezultat** | Preferencje zapisane w bazie: `notifyEmail=false`, `notifyAssignments=false`, `notifyBrowser=true`, `notifyTicketUpdates=true`. Po odświeżeniu strony przełączniki odzwierciedlają zapisany stan (ładowane z odpowiedzi `/auth/verify`). |
| **Pokrycie** | Preferencje powiadomień, persystencja, spójność frontend-backend |

---

## TC-29 — Zarządzanie zmianami — tworzenie i przepływ

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F20 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | AGENT zalogowany |
| **Kroki** | 1. Utwórz nową zmianę (Change Request): tytuł, opis, uzasadnienie, priorytet=HIGH, kategoria=NORMAL. 2. Zmień status: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SCHEDULED (podaj daty). 3. Zmień na IN_PROGRESS → IMPLEMENTED → VERIFIED → CLOSED. |
| **Oczekiwany rezultat** | Przepływ statusów walidowany (niedozwolone przejścia odrzucane z błędem 400). Automatyczne daty: `approvedAt` przy APPROVED, `implementedAt` przy IMPLEMENTED, `verifiedAt` przy VERIFIED, `closedAt` przy CLOSED. Każda zmiana statusu logowana w ChangeAuditLog z fromValue/toValue, IP, user-agent. |
| **Pokrycie** | ITIL Change Management, workflow statusów, automatyczne daty, audyt |

---

## TC-30 — Zarządzanie zmianami — odrzucenie i anulowanie

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F20 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Istniejąca zmiana w statusie UNDER_REVIEW |
| **Kroki** | 1. Odrzuć zmianę (UNDER_REVIEW → REJECTED). 2. Sprawdź, że z REJECTED nie można przejść do żadnego statusu. 3. Utwórz nową zmianę, przenieś do APPROVED, następnie CANCELLED. |
| **Oczekiwany rezultat** | REJECTED i CANCELLED to stany terminalne — dalsze zmiany statusu niemożliwe. Próba niedozwolonego przejścia zwraca HTTP 400. |
| **Pokrycie** | Stany terminalne, walidacja przejść, FAILED → ponowna próba (retry do SCHEDULED) |

---

## TC-31 — Archiwizacja i przywracanie zgłoszeń

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F21 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Zgłoszenie w statusie CLOSED lub RESOLVED; AGENT zalogowany |
| **Kroki** | 1. Oznacz zgłoszenie jako archiwalne (PUT `/tickets/:id/archive`). 2. Sprawdź, że zgłoszenie zniknęło z domyślnej listy. 3. Przejrzyj archiwum (parametr `archived=true`). 4. Przywróć zgłoszenie z archiwum. |
| **Oczekiwany rezultat** | Archiwizacja: `isArchived=true`, `archivedAt` ustawione. Domyślna lista zwraca tylko `isArchived=false`. Przywrócenie: `isArchived=false`, `archivedAt=null`. Tylko AGENT/ADMIN/SUPER_ADMIN mogą archiwizować. Tylko zgłoszenia CLOSED lub RESOLVED mogą być archiwizowane (inne statusy → błąd 400). Log audytu: ARCHIVE_TICKET / RESTORE_TICKET. |
| **Pokrycie** | Archiwizacja, przywracanie, walidacja statusu, kontrola ról, audyt |

---

## TC-32 — Alerty nawracające — potwierdzenie i rozwiązanie

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F12 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Istniejący alert nawracający w statusie ACTIVE |
| **Kroki** | 1. Przejdź do widoku alertów nawracających. 2. Potwierdź alert (Acknowledge) z opcjonalną notatką. 3. Rozwiąż alert (Resolve) z wymaganą notatką. 4. Sprawdź log audytu. |
| **Oczekiwany rezultat** | Status: ACTIVE → ACKNOWLEDGED → RESOLVED. Pole `acknowledgedById` oraz `notes` wypełnione. Audyt: ACKNOWLEDGE_ALERT, RESOLVE_ALERT. Można też odrzucić alert jako fałszywy alarm (DISMISS). |
| **Pokrycie** | Workflow alertów, acknowledge/resolve/dismiss |

---

## TC-33 — Zarządzanie tagami (CRUD) w panelu administracyjnym

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F4 |
| **Priorytet** | Średni |
| **Warunki wstępne** | AGENT zalogowany |
| **Kroki** | 1. Przejdź do Ustawienia → Zarządzanie tagami. 2. Utwórz nowy tag: podaj nazwę i kolor (predefiniowany lub niestandardowy). 3. Sprawdź tag na liście. 4. Zaloguj się jako SUPER_ADMIN i usuń tag. |
| **Oczekiwany rezultat** | Tag utworzony z unikalną nazwą i kolorem. Usuwanie dostępne tylko dla SUPER_ADMIN. Lista tagów wyświetla liczbę powiązanych zgłoszeń. |
| **Pokrycie** | CRUD tagów, kontrola ról przy usuwaniu |

---

## TC-34 — Przypisywanie i usuwanie tagów ze zgłoszenia

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F4 |
| **Priorytet** | Średni |
| **Warunki wstępne** | AGENT zalogowany; istniejące tagi i zgłoszenie |
| **Kroki** | 1. Otwórz szczegóły zgłoszenia jako AGENT. 2. W sekcji „Tagi" w sidebarze kliknij dropdown i przypisz tag. 3. Usuń inny tag klikając „×" przy nazwie. |
| **Oczekiwany rezultat** | Tag przypisany: rekord w TicketTag z `assignedAt`. Usunięcie: rekord usunięty z TicketTag. Tagi wyświetlane jako kolorowe badge. Dropdown filtruje tagi już przypisane. |
| **Pokrycie** | Przypisywanie/usuwanie tagów, relacja many-to-many |

---

## TC-35 — Integracja IMAP — test połączenia

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F24, F7 |
| **Priorytet** | Średni |
| **Warunki wstępne** | SUPER_ADMIN zalogowany; dane IMAP serwera dostępne |
| **Kroki** | 1. Przejdź do Ustawienia → Email (SMTP/IMAP). 2. Podaj dane IMAP (host, port, użytkownik, hasło). 3. Kliknij „Testuj połączenie". 4. Jeśli sukces — włącz polling i zapisz. |
| **Oczekiwany rezultat** | Test połączenia: `testImapConnection()` próbuje nawiązać połączenie z serwerem IMAP i zwraca sukces/błąd. Po aktywacji — scheduler rozpoczyna polling co N minut. Flaga `_pollRunning` zapobiega równoczesnym pollingom. |
| **Pokrycie** | Konfiguracja IMAP, test połączenia, debounce pollingu |

---

## TC-36 — Uwierzytelnianie wieloskładnikowe (MFA/TOTP)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF7 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | Użytkownik zalogowany, MFA wyłączone |
| **Kroki** | 1. Przejdź do Ustawienia → Bezpieczeństwo. 2. Kliknij „Włącz MFA". 3. Zeskanuj kod QR aplikacją authenticator. 4. Wpisz 6-cyfrowy kod TOTP i potwierdź. 5. Sprawdź kody zapasowe (10 × 8-znakowy hex). 6. Wyloguj się i zaloguj ponownie. |
| **Oczekiwany rezultat** | Po włączeniu MFA: logowanie wymaga kodu TOTP (lub kodu zapasowego). Tolerancja: 2 time-steps (speakeasy). Kody zapasowe: jednorazowe, po użyciu usuwane z tablicy. Próba logowania bez kodu → `{ mfaRequired: true }` (nie błąd). Regeneracja kodów zapasowych wymaga ważnego tokena TOTP. Audyt: MFA_ENABLED. |
| **Pokrycie** | TOTP, kody zapasowe, tolerancja czasowa, wymuszanie MFA przy logowaniu |

---

## TC-37 — Kontrola dostępu oparta na rolach (RBAC)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF7 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | Użytkownicy z każdą z 4 ról: KLIENT, AGENT, ADMIN, SUPER_ADMIN |
| **Kroki** | 1. Jako KLIENT — spróbuj wejść na `/audit/` (GET). 2. Jako KLIENT — spróbuj usunąć użytkownika. 3. Jako AGENT — spróbuj usunąć tag. 4. Jako AGENT — spróbuj wejść na `/recurring-alerts/analyze` (POST). 5. Jako ADMIN — zarządzaj użytkownikami. 6. Jako SUPER_ADMIN — wykonaj wszystkie powyższe akcje. |
| **Oczekiwany rezultat** | KLIENT: brak dostępu do audytu (403), brak usuwania użytkowników (403), widzi tylko swoje zgłoszenia, nie widzi komentarzy wewnętrznych. AGENT: dostęp do mapowanych kategorii, brak usuwania tagów (tylko SUPER_ADMIN), brak wyzwalania analizy alertów (tylko ADMIN+). ADMIN: zarządzanie użytkownikami, zmiana ról. SUPER_ADMIN: pełny dostęp do wszystkiego. |
| **Pokrycie** | 4 role, kontrola endpointów, filtrowanie danych wg roli |

---

## TC-38 — Log audytu

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF1 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | SUPER_ADMIN zalogowany; wykonano kilka akcji w systemie |
| **Kroki** | 1. Przejdź do Ustawienia → Log audytu. 2. Przeglądaj logi z filtrami: akcja, typ encji, użytkownik, zakres dat, wyszukiwanie tekstowe. 3. Sprawdź, czy logowane są: LOGIN, LOGIN_SSO, CREATE_TICKET, STATUS_CHANGE, ASSIGN_TICKET, CREATE_COMMENT, UPDATE_USER, DELETE_USER, MFA_ENABLED. |
| **Oczekiwany rezultat** | Każda operacja logowana z: action, entityType, entityId, userId, ipAddress, userAgent, changes (JSON z detalami). Paginacja (max 200/stronę). Filtrowanie po akcji (LIKE), dacie, użytkowniku. Endpoint `/audit/actions` zwraca listę unikalnych akcji. Dostępne TYLKO dla SUPER_ADMIN. |
| **Pokrycie** | Automatyczny audyt, paginacja, filtrowanie, kontrola dostępu |

---

## TC-39 — Responsywność interfejsu (RWD)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF2 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | Aplikacja dostępna w przeglądarce |
| **Kroki** | 1. Otwórz AlmaDesk-Edu w przeglądarce na komputerze (1920×1080). 2. Zmień rozmiar okna do tabletu (768px). 3. Zmień rozmiar do smartfona (375px). 4. Sprawdź kluczowe widoki: dashboard, lista zgłoszeń, szczegóły zgłoszenia, ustawienia, formularz tworzenia zgłoszenia. |
| **Oczekiwany rezultat** | Na każdej rozdzielczości: nawigacja dostępna (sidebar zwijany lub hamburger menu), formularze czytelne, tabele z horyzontalnym scrollem, kafelki KPI układają się w kolumny. Brak obciętych treści. Pola „triple-column" (lokalizacja/wydział/laboratorium) przechodzą na układ 1-kolumnowy na mobile. |
| **Pokrycie** | RWD, breakpoints, układ formularzy, nawigacja mobilna |

---

## TC-40 — Wydajność — czas odpowiedzi API < 2s

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF3 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | System uruchomiony; kilkadziesiąt zgłoszeń w bazie; Redis aktywny |
| **Kroki** | 1. Zmierz czas odpowiedzi GET `/tickets/` (lista zgłoszeń). 2. Zmierz czas odpowiedzi GET `/stats/dashboard` (KPI). 3. Zmierz czas odpowiedzi GET `/tickets/search?q=test` (wyszukiwanie ES). 4. Zmierz czas odpowiedzi POST `/tickets/` (tworzenie zgłoszenia). 5. Zmierz czas GET `/reports/data` (dane raportowe). |
| **Oczekiwany rezultat** | Wszystkie odpowiedzi API poniżej 2 sekund. Cache Redis (30s na listę zgłoszeń, 60s na szczegóły) przyspiesza kolejne zapytania. Elasticsearch odpowiada szybciej niż fallback Prisma. |
| **Pokrycie** | Czas odpowiedzi, cache Redis, wydajność ES |

---

## TC-41 — Skalowalność — konteneryzacja Docker

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF4, A7 |
| **Priorytet** | Średni |
| **Warunki wstępne** | docker-compose.yml dostępny |
| **Kroki** | 1. Uruchom `docker compose up -d`. 2. Sprawdź, że wszystkie 9 kontenerów działają (postgres, pgadmin, redis, elasticsearch, keycloak, minio, postgres_logs, prometheus, grafana). 3. Sprawdź sieć `almadesk_network` (bridge). 4. Sprawdź health check dla każdego kontenera. |
| **Oczekiwany rezultat** | Wszystkie kontenery uruchomione i zdrowe. Sieć izolowana. Wolumeny danych zamontowane (persistence). Konfiguracja umożliwia skalowanie horyzontalne (np. `docker compose up --scale backend=3`). |
| **Pokrycie** | Docker Compose, 9 usług, sieć, wolumeny, health checks |

---

## TC-42 — Monitoring — Prometheus + Grafana

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF5, NF6, A6 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Prometheus i Grafana uruchomione |
| **Kroki** | 1. Otwórz Prometheus (:9090) → Targets. 2. Sprawdź, że aktywne cele: backend (/api/metrics), postgres, redis, elasticsearch, keycloak, minio. 3. Otwórz Grafana (:3000). 4. Sprawdź dostępność dashboardów. |
| **Oczekiwany rezultat** | Prometheus zbiera metryki ze wszystkich 8 celów co 15s. Grafana wyświetla dashboardy z metrykami. Scrape interval: 15s, retencja: 30 dni. Cele: almadesk-backend:3001/api/metrics, elasticsearch:9200/_prometheus/metrics, keycloak:8080/metrics, minio:9000/minio/v2/metrics/cluster. |
| **Pokrycie** | Prometheus scraping, Grafana dashboards, monitoring metryczny |

---

## TC-43 — Backup i przywracanie

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF5, NF11 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | PowerShell dostępny; kontenery PostgreSQL i MinIO uruchomione |
| **Kroki** | 1. Uruchom `backup.ps1 -BackupDir C:\Backups\AlmaDesk`. 2. Sprawdź utworzone pliki ZIP (główna baza, logi, MinIO, konfiguracje). 3. Sprawdź retencję (pliki starsze niż 30 dni usunięte). 4. Sprawdź statystyki (Show-BackupStats). |
| **Oczekiwany rezultat** | Utworzone archiwa ZIP: Backup-PostgresMain (pg_dump głównej bazy), Backup-PostgresLogs (pg_dump logów), Backup-Minio (mc mirror bucketa), Backup-Configs (docker-compose.yml, prometheus.yml, .env, realm JSON). Cleanup: usuwanie backupów starszych niż RetentionDays. |
| **Pokrycie** | Backup 4 komponentów, retencja, automatyzacja |

---

## TC-44 — Szyfrowanie i bezpieczeństwo danych

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF7, NF9 |
| **Priorytet** | Krytyczny |
| **Warunki wstępne** | System uruchomiony |
| **Kroki** | 1. Sprawdź, że hasła użytkowników w bazie są zahashowane (bcrypt). 2. Sprawdź, że tokeny MFA są szyfrowane (base32). 3. Sprawdź, że kody zapasowe MFA są hashowane (bcrypt). 4. Sprawdź, że pole `isSecret` w SystemSettings ukrywa wrażliwe wartości. 5. Sprawdź, że JWT zawiera tylko minimalne dane (id, login, role). |
| **Oczekiwany rezultat** | Hasła: bcrypt hash (nie plaintext). MFA secret: base32 encoded. Backup codes: każdy osobno bcrypt-hashowany. SystemSettings z `isSecret=true`: wartości nie zwracane w API. JWT payload: tylko `{ id, login, role }` — bez hasła, emaila czy danych wrażliwych. |
| **Pokrycie** | bcrypt, bezpieczeństwo tokenów, minimalizacja danych w JWT, RODO |

---

## TC-45 — Kompatybilność z przeglądarkami

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF10 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Aplikacja dostępna w sieci |
| **Kroki** | 1. Otwórz AlmaDesk-Edu w: Chrome (latest), Firefox (latest), Edge (latest), Safari (latest). 2. Na każdej przeglądarce: zaloguj się, utwórz zgłoszenie, zmień motyw, przełącz filtr w kolejce, otwórz szczegóły zgłoszenia, dodaj komentarz. |
| **Oczekiwany rezultat** | Aplikacja działa poprawnie we wszystkich 4 przeglądarkach. React 19 + Vite 7 generują kod kompatybilny z nowoczesnymi przeglądarkami. CSS `color-mix()` i zmienne CSS obsługiwane poprawnie. Brak białych ekranów, błędów renderowania ani uszkodzonych layoutów. |
| **Pokrycie** | Chrome, Firefox, Edge, Safari; CSS variables, color-mix() |

---

## TC-46 — Przyjazny interfejs — motywy kolorystyczne

| Pole | Wartość |
|------|---------|
| **Wymaganie** | NF8 |
| **Priorytet** | Niski |
| **Warunki wstępne** | Użytkownik zalogowany |
| **Kroki** | 1. Przejdź do Ustawienia → Wygląd. 2. Sprawdź dostępność motywów (ThemeSelector). 3. Wybierz ciemny motyw. 4. Sprawdź czytelność interfejsu. 5. Wybierz jasny motyw. |
| **Oczekiwany rezultat** | System oferuje 10 motywów kolorystycznych. Zmiana motywu jest natychmiastowa (CSS variables). Motywy ciemne i jasne zachowują czytelność tekstu, kontrast i spójność kolorystyczną. Wybór motywu persystowany. |
| **Pokrycie** | ThemeSelector, 10 motywów, CSS variables, persystencja |

---

## TC-47 — Architektura — kontener cache Redis

| Pole | Wartość |
|------|---------|
| **Wymaganie** | A4 |
| **Priorytet** | Średni |
| **Warunki wstępne** | Redis uruchomiony na porcie 6379 |
| **Kroki** | 1. Wyślij GET `/tickets/` — zanotuj czas odpowiedzi. 2. Wyślij ponownie GET `/tickets/` w ciągu 30s. 3. Utwórz nowe zgłoszenie (POST `/tickets/`) lub zmień status — sprawdź invalidację cache. 4. Wyślij GET `/tickets/` ponownie. |
| **Oczekiwany rezultat** | Drugie zapytanie szybsze (dane z Redis, TTL 30s dla listy, 60s dla szczegółów). Po utworzeniu/zmianie zgłoszenia cache jest automatycznie czyszczony (invalidacja). Trzecie zapytanie pobiera świeże dane z Prisma/PostgreSQL. Redis wspomaga wyszukiwanie i sesje. |
| **Pokrycie** | Redis cache, TTL, invalidacja, przyspieszenie odpowiedzi |

---

## TC-48 — Architektura — kontener magazynu obiektów MinIO

| Pole | Wartość |
|------|---------|
| **Wymaganie** | A3 |
| **Priorytet** | Średni |
| **Warunki wstępne** | MinIO uruchomiony na portach 9000/9001 |
| **Kroki** | 1. Prześlij plik PDF jako załącznik do zgłoszenia. 2. Sprawdź w MinIO Console (port 9001), że plik istnieje w bucketcie. 3. Pobierz plik przez API (GET `/tickets/attachments/:id/download`). 4. Usuń plik (DELETE). 5. Sprawdź, że plik usunięto z bucketa MinIO. |
| **Oczekiwany rezultat** | Pliki przechowywane w MinIO (S3-kompatybilny), nie w bazie danych. Rekord Attachment w bazie: minioKey, minioBucket. Upload → plik w MinIO + rekord w Attachment. Delete → usunięcie z MinIO + usunięcie rekordu. Baza danych nie jest obciążana blobami. |
| **Pokrycie** | MinIO upload/download/delete, separacja storage od DB |

---

## TC-49 — Architektura — dwa kontenery PostgreSQL (dane + logi)

| Pole | Wartość |
|------|---------|
| **Wymaganie** | A2 (kontener danych), A2b (kontener logów) |
| **Priorytet** | Średni |
| **Warunki wstępne** | Oba kontenery PostgreSQL uruchomione (porty 5432 i 5433) |
| **Kroki** | 1. Wykonaj akcję generującą wpis audytu (np. logowanie). 2. Sprawdź w głównej bazie (port 5432): tabele users, tickets, comments, attachments, etc. 3. Sprawdź w bazie logów (port 5433): dane audytowe. 4. Zweryfikuj, że obie bazy działają niezależnie. |
| **Oczekiwany rezultat** | Główna baza (almadesk_db, port 5432): dane operacyjne (15+ tabel Prisma). Baza logów (almadesk_logs, port 5433): niezależna instancja PostgreSQL do logowania aktywności. Separacja zapewnia: logi nie wpływają na wydajność głównej bazy, niezależny backup, możliwość rotacji logów. |
| **Pokrycie** | Dwa kontenery PostgreSQL, separacja danych i logów |

---

## TC-50 — Ograniczenie uprawnień KLIENTA — zmiana statusu

| Pole | Wartość |
|------|---------|
| **Wymaganie** | F8, NF7 |
| **Priorytet** | Wysoki |
| **Warunki wstępne** | KLIENT zalogowany; istniejące zgłoszenie autora |
| **Kroki** | 1. Jako KLIENT — spróbuj zmienić status własnego zgłoszenia z OPEN na IN_PROGRESS. 2. Spróbuj zmienić status z OPEN na CLOSED. 3. Spróbuj zmienić status cudzego zgłoszenia. 4. Mając zamknięte zgłoszenie (CLOSED) — spróbuj ponownie otworzyć (reopen). |
| **Oczekiwany rezultat** | KLIENT może TYLKO: zamknąć (CLOSED) własne zgłoszenie LUB ponownie otworzyć (reopen) własne zamknięte zgłoszenie. Zmiana na IN_PROGRESS, RESOLVED, PENDING, ON_HOLD — odrzucona (403 lub ograniczenie logiki). Zmiana statusu cudzego zgłoszenia — odrzucona. |
| **Pokrycie** | Ograniczenia roli KLIENT, bezpieczna zmiana statusu |

---

## Macierz pokrycia wymagań

### Wymagania funkcjonalne (F1–F24)

| Wymaganie | Przypadki testowe |
|-----------|-------------------|
| F1 — SSO (Azure AD, SAML, OIDC) | TC-01, TC-02 |
| F2 — Identyfikacja agenta (podpis) | TC-03 |
| F3 — Tworzenie klienta z zgłoszenia | TC-04, TC-11 |
| F4 — Wyszukiwanie/filtrowanie po tagu | TC-05, TC-33, TC-34 |
| F5 — Wyszukiwanie po tytule/treści | TC-06 |
| F6 — Dashboardy KPI wg roli | TC-07, TC-08 |
| F7 — Wielokanałowość (email, portal, telefon, czat) | TC-09, TC-10, TC-11 |
| F8 — Stany i priorytety zgłoszeń | TC-12, TC-13, TC-50 |
| F9 — Historia i status w panelu klienta | TC-14 |
| F10 — Moduł raportowania i monitoring | TC-15, TC-16 |
| F11 — Raporty jakości, automatyczne raporty | TC-15, TC-16, TC-17 |
| F12 — Alerty o nawracających problemach | TC-18, TC-32 |
| F13 — Komentarze wewnętrzne | TC-19 |
| F14 — Przeglądanie wg wydziałów/lokalizacji/laboratoriów | TC-20 |
| F15 — Panel samoobsługi (self-service) | TC-14, TC-21 |
| F16 — Edycja odpowiedzi | TC-22 |
| F17 — Załączniki (klient i agent) | TC-23, TC-24 |
| F18 — Automatyzacja (szablony, FAQ) | TC-21, TC-25 |
| F19 — Integracje (CRM, Teams) | TC-11 (częściowo — Teams jako źródło) |
| F20 — Zarządzanie zmianami (ITIL) | TC-29, TC-30 |
| F21 — Usunięcie/archiwizacja zgłoszenia | TC-31 |
| F22 — Wsparcie AI, analiza nastroju | TC-18 (częściowo — sugestie automatyczne) |
| F23 — Szablony, automatyzacja, powiadomienia email | TC-25, TC-26, TC-27, TC-28 |
| F24 — Integracja IMAP/Exchange | TC-10, TC-35 |

### Wymagania niefunkcjonalne (NF1–NF11)

| Wymaganie | Przypadki testowe |
|-----------|-------------------|
| NF1 — Automatyczny audyt | TC-38 |
| NF2 — Responsywność (web + mobile) | TC-39 |
| NF3 — Czas odpowiedzi < 2s | TC-40 |
| NF4 — Skalowalność | TC-41 |
| NF5 — SLA 99,9%, auto-recovery | TC-42, TC-43 |
| NF6 — Aktualizacja, monitoring, logowanie | TC-42 |
| NF7 — Szyfrowanie, MFA, RBAC | TC-36, TC-37, TC-44 |
| NF8 — Przyjazny interfejs | TC-46 |
| NF9 — RODO | TC-44 |
| NF10 — Kompatybilność przeglądarek | TC-45 |
| NF11 — Automatyczne backupy | TC-43 |

### Wymagania architektoniczne (A1–A8)

| Wymaganie | Przypadki testowe |
|-----------|-------------------|
| A1 — Frontend (React) + Backend (Node.js) | TC-09, TC-40 |
| A2 — Kontenery baz danych (dane + logi) | TC-49 |
| A3 — Kontener MinIO (magazyn obiektów) | TC-23, TC-24, TC-48 |
| A4 — Kontener Redis (cache) | TC-47 |
| A5 — Kontener Keycloak (SSO/IAM) | TC-01, TC-02 |
| A6 — Prometheus + Grafana (monitoring) | TC-42 |
| A7 — Orkiestracja (Docker/K8s/Helm) | TC-41 |
| A8 — NGINX Ingress (TLS) | (weryfikacja wymaga wdrożenia K8s) |
