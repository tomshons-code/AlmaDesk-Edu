# 🔐 Integracja Azure AD / SAML z AlmaDesk-Edu

## Spis treści
1. [Wprowadzenie](#wprowadzenie)
2. [Metoda 1: Azure AD przez OIDC (Zalecana)](#metoda-1-azure-ad-przez-oidc-zalecana)
3. [Metoda 2: SAML 2.0](#metoda-2-saml-20)
4. [Konfiguracja Keycloak](#konfiguracja-keycloak)
5. [Testowanie](#testowanie)
6. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Wprowadzenie

AlmaDesk-Edu obsługuje logowanie jednokrotne (SSO) poprzez:
- **Azure Active Directory** (OIDC/OAuth 2.0) - zalecane
- **SAML 2.0** - dla innych dostawców tożsamości

Integracja odbywa się przez **Keycloak** jako Identity Broker, który:
- Zarządza sesjami użytkowników
- Mapuje role z Azure AD na role AlmaDesk
- Synchronizuje atrybuty użytkowników

---

## Metoda 1: Azure AD przez OIDC (Zalecana)

### Krok 1: Rejestracja aplikacji w Azure Portal

1. Zaloguj się do [Azure Portal](https://portal.azure.com)
2. Przejdź do **Azure Active Directory** → **App registrations**
3. Kliknij **New registration**
4. Uzupełnij formularz:
   - **Name**: `AlmaDesk-Edu`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: 
     ```
     Web: http://localhost:8080/realms/almadesk/broker/azure-ad/endpoint
     ```
     > Dla produkcji zmień `localhost:8080` na adres Keycloak

5. Kliknij **Register**

### Krok 2: Konfiguracja aplikacji w Azure

1. W aplikacji przejdź do **Certificates & secrets**
2. Kliknij **New client secret**
   - **Description**: `AlmaDesk Keycloak Integration`
   - **Expires**: `24 months` (lub według polityki)
3. **SKOPIUJ WARTOŚĆ** (secret value) - nie będzie już widoczna!

4. Przejdź do **API permissions**
   - Kliknij **Add a permission** → **Microsoft Graph**
   - Wybierz **Delegated permissions**
   - Dodaj:
     - `openid`
     - `profile`
     - `email`
     - `User.Read`
   - Kliknij **Grant admin consent** (jeśli masz uprawnienia)

5. Przejdź do **Token configuration**
   - Kliknij **Add optional claim**
   - Typ: **ID**
   - Zaznacz:
     - `email`
     - `family_name`
     - `given_name`
     - `preferred_username`
   - Zaakceptuj zgody na Graph API

### Krok 3: Zbierz dane konfiguracyjne

Z zakładki **Overview** aplikacji skopiuj:

```bash
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID:   yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

### Krok 4: Konfiguracja AlmaDesk Backend

Edytuj plik `.env` lub ustaw zmienne środowiskowe:

```bash
# Azure AD Configuration
AZURE_AD_ENABLED=true
AZURE_AD_TENANT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
AZURE_AD_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_CLIENT_SECRET=Twój~Secret~Z~Azure
AZURE_AD_DISPLAY_NAME="Sign in with Microsoft"

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=almadesk
```

### Krok 5: Uruchom skrypt konfiguracyjny

```bash
cd app/backend
node setup-azure-ad.js
```

Skrypt zapyta o:
- Keycloak admin username (domyślnie: `admin`)
- Keycloak admin password
- Azure AD Tenant ID (jeśli nie w .env)
- Azure AD Client ID (jeśli nie w .env)
- Azure AD Client Secret (jeśli nie w .env)

Skrypt automatycznie:
- Utworzy Identity Provider w Keycloak
- Skonfiguruje mapowania atrybutów (email, firstName, lastName)
- Wyświetli instrukcje dalszej konfiguracji

### Krok 6: Zweryfikuj w Keycloak Admin Console

1. Otwórz http://localhost:8080
2. Zaloguj się jako admin
3. Wybierz realm **almadesk**
4. Przejdź do **Identity providers**
5. Sprawdź czy **azure-ad** jest **Enabled**
6. Kliknij na **azure-ad** → **Export**
7. Skopiuj **Redirect URI** (jeśli jeszcze nie dodany w Azure)

---

## Metoda 2: SAML 2.0

### Krok 1: Konfiguracja SAML w Keycloak

1. Otwórz Keycloak Admin Console
2. Realm: **almadesk**
3. **Identity providers** → **Add provider** → **SAML v2.0**
4. Alias: `saml-idp`
5. Display name: `University SSO`

### Krok 2: Pobierz metadata z Keycloak

URL metadanych Keycloak SAML SP:
```
http://localhost:8080/realms/almadesk/broker/saml-idp/endpoint/descriptor
```

### Krok 3: Konfiguracja w dostawcy SAML

W swoim Identity Provider (np. Azure AD SAML, Shibboleth, ADFS):

1. Dodaj nową aplikację SAML
2. Upload metadanych z Keycloak SAML SP
3. Skonfiguruj mapowania atrybutów:
   ```
   http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress → email
   http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname → firstName
   http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname → lastName
   http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name → username
   ```

### Krok 4: Dodaj metadata IdP do Keycloak

1. W Keycloak IdP config:
2. Wklej **SAML Metadata URL** lub **XML metadata**
3. Zapisz

---

## Konfiguracja Keycloak

### Mapowanie ról z Azure AD

Jeśli Azure AD zwraca role w tokenie, możesz automatycznie mapować je na role AlmaDesk:

1. W Azure AD dodaj **App roles** do aplikacji:
   ```json
   {
     "allowedMemberTypes": ["User"],
     "description": "IT Support Agent",
     "displayName": "AlmaDesk Agent",
     "id": "guid-here",
     "value": "AlmaDesk.Agent"
   }
   ```

2. Przypisz użytkowników do ról w Azure AD

3. W Keycloak IdP Mappers dodaj:
   - Type: **Claim to Role**
   - Claim: `roles`
   - Claim Value: `AlmaDesk.Agent`
   - Role: `AGENT`

### Mapowanie grup z Azure AD

Alternatywnie, możesz mapować grupy Azure AD:

1. W Azure AD Token Configuration dodaj **groups claim**
2. W Keycloak dodaj mapper:
   - Type: **Attribute to Role**
   - Attribute Name: `groups`
   - Attribute Value: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (Group ID)
   - Target Role: `AGENT`

### Domyślna rola dla nowych użytkowników

Wszyscy nowi użytkownicy SSO domyślnie otrzymują rolę **KLIENT** (USER).

Administrator może later zmienić rolę w panelu **Użytkownicy**.

---

## Testowanie

### Test 1: Logowanie przez Azure AD

1. Otwórz http://localhost:5173 (AlmaDesk Frontend)
2. Na stronie logowania kliknij **"Sign in with Microsoft"**
3. Zostaniesz przekierowany do Azure AD
4. Zaloguj się kontem uczelnianym
5. Po zalogowaniu powinieneś zostać przekierowany do dashboardu AlmaDesk

### Test 2: Weryfikacja atrybutów

Sprawdź czy dane użytkownika zostały poprawnie zsynchronizowane:
```bash
# W backend console
curl -X GET http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Oczekiwana odpowiedź:
```json
{
  "user": {
    "id": 123,
    "login": "jan.kowalski@university.edu",
    "email": "jan.kowalski@university.edu",
    "name": "Jan Kowalski",
    "role": "KLIENT"
  }
}
```

### Test 3: Wylogowanie (Single Logout)

1. Kliknij **Wyloguj** w AlmaDesk
2. Powinieneś zostać także wylogowany z Azure AD

---

## Rozwiązywanie problemów

### Problem 1: "Invalid redirect_uri"

**Przyczyna**: Redirect URI w Azure AD nie pasuje do Keycloak

**Rozwiązanie**:
1. Sprawdź dokładny redirect URI w Keycloak Admin:
   ```
   Identity Providers → azure-ad → Settings → Redirect URI
   ```
2. Dodaj ten DOKŁADNY URI w Azure Portal:
   ```
   App Registration → Authentication → Redirect URIs
   ```

### Problem 2: "Missing email claim"

**Przyczyna**: Azure AD nie zwraca email w tokenie

**Rozwiązanie**:
1. Azure Portal → App Registration → Token configuration
2. Add optional claim → ID → `email`
3. Zaakceptuj zgody na Microsoft Graph

### Problem 3: "User created but no role assigned"

**Przyczyna**: Brak mapowania ról

**Rozwiązanie**:
Wszyscy nowi użytkownicy SSO domyślnie otrzymują rolę `KLIENT`.
Administrator musi ręcznie zmienić rolę w panelu AlmaDesk:
1. Dashboard → Użytkownicy
2. Znajdź użytkownika → Edytuj
3. Zmień rolę na AGENT lub ADMIN

### Problem 4: "Token validation failed"

**Przyczyna**: Niepoprawny Tenant ID lub brak synchronizacji czasu

**Rozwiązanie**:
1. Sprawdź Tenant ID w `.env`:
   ```bash
   echo $AZURE_AD_TENANT_ID
   ```
2. Zweryfikuj synchronizację czasu serwera:
   ```bash
   date
   ```
3. Sprawdź logi Keycloak:
   ```bash
   docker logs keycloak -f
   ```

### Problem 5: "SSO button not visible"

**Przyczyna**: `AZURE_AD_ENABLED` nie jest ustawione

**Rozwiązanie**:
```bash
# W .env
AZURE_AD_ENABLED=true
```

Zrestartuj backend:
```bash
cd app/backend
npm run dev
```

---

## Produkcja

### Checklist przed wdrożeniem

- [ ] HTTPS jest włączony dla Keycloak i AlmaDesk
- [ ] Redirect URIs w Azure AD używają HTTPS
- [ ] `JWT_SECRET` jest silny i unikalny
- [ ] `AZURE_AD_CLIENT_SECRET` jest w zmiennych środowiskowych (nie w kodzie)
- [ ] Keycloak używa silnego hasła admina
- [ ] Backupy Keycloak realm są skonfigurowane
- [ ] Monitoring i logi są aktywne
- [ ] Test SSO login działa na produkcji

### Bezpieczne zmienne środowiskowe

Nie używaj `.env` w produkcji. Użyj:
- **Kubernetes Secrets**
- **Azure Key Vault**
- **AWS Secrets Manager**
- **Docker Secrets**

Przykład (Kubernetes):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: almadesk-azure-ad
type: Opaque
stringData:
  AZURE_AD_CLIENT_SECRET: "twój-secret"
  AZURE_AD_TENANT_ID: "tenant-id"
  AZURE_AD_CLIENT_ID: "client-id"
```

---

## Dodatkowe zasoby

- [Keycloak Azure AD Integration Guide](https://www.keycloak.org/docs/latest/server_admin/#_azure)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OIDC Protocol](https://openid.net/connect/)
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)

---

## Kontakt i wsparcie

W razie problemów:
1. Sprawdź logi Keycloak: `docker logs keycloak`
2. Sprawdź logi AlmaDesk Backend: `npm run dev`
3. Skontaktuj się z administratorem systemu

**Status integracji**: ✅ Gotowe (Wersja 1.0.0)
