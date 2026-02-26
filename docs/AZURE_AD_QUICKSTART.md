# 🚀 Azure AD Quick Start

Ten przewodnik pomoże Ci w 15 minut skonfigurować logowanie przez Azure Active Directory w AlmaDesk-Edu.

## 📋 Wymagania wstępne

- Azure AD tenant (domena organizacji)
- Uprawnienia administratora w Azure Portal
- AlmaDesk-Edu działający lokalnie lub w chmurze

## ⚡ Konfiguracja w 5 krokach

### Krok 1: Rejestracja aplikacji w Azure Portal (5 min)

1. Otwórz [Azure Portal](https://portal.azure.com)
2. Przejdź: **Azure Active Directory** → **App registrations** → **New registration**
3. Wypełnij:
   ```
   Name: AlmaDesk-Edu
   Account type: Single tenant
   Redirect URI: http://localhost:8080/realms/almadesk/broker/azure-ad/endpoint
   ```
4. Kliknij **Register**

### Krok 2: Wygeneruj Client Secret (2 min)

1. W aplikacji: **Certificates & secrets** → **New client secret**
2. Description: `AlmaDesk Integration`
3. Expires: `24 months`
4. **SKOPIUJ WARTOŚĆ** 🔴 (nie będzie ponownie widoczna!)

### Krok 3: Skonfiguruj uprawnienia (2 min)

1. **API permissions** → **Add permission** → **Microsoft Graph** → **Delegated**
2. Dodaj: `openid`, `profile`, `email`, `User.Read`
3. **Grant admin consent for {Twoja organizacja}**

### Krok 4: Dodaj optional claims (2 min)

1. **Token configuration** → **Add optional claim** → **ID**
2. Zaznacz: `email`, `family_name`, `given_name`, `preferred_username`
3. Zaakceptuj zgody

### Krok 5: Skonfiguruj AlmaDesk (4 min)

**A. Ustaw zmienne środowiskowe:**

```bash
# app/backend/.env
AZURE_AD_ENABLED=true
AZURE_AD_TENANT_ID=<Directory (tenant) ID z Azure>
AZURE_AD_CLIENT_ID=<Application (client) ID z Azure>
AZURE_AD_CLIENT_SECRET=<Secret value z kroku 2>
```

**B. Uruchom skrypt konfiguracyjny:**

```bash
cd app/backend
node setup-azure-ad.js
```

Podaj hasło admina Keycloak (domyślnie: `admin`)

**C. Zrestartuj backend:**

```bash
npm run dev
```

## ✅ Testowanie

1. Otwórz http://localhost:5173
2. Kliknij **"Sign in with Microsoft"**
3. Zaloguj się kontem z Azure AD
4. Zostaniesz przekierowany do AlmaDesk

## 🎯 Co dalej?

### Przypisywanie ról

Nowi użytkownicy SSO domyślnie otrzymują rolę **KLIENT**.

Aby zmienić rolę:
1. Zaloguj się jako admin
2. **Dashboard** → **Użytkownicy**
3. Znajdź użytkownika → **Edytuj** → Zmień rolę

### Automatyczne mapowanie ról (opcjonalne)

Możesz skonfigurować automatyczne przypisywanie ról na podstawie grup Azure AD:

Dokumentacja: [AZURE_AD_INTEGRATION.md](./AZURE_AD_INTEGRATION.md#mapowanie-ról-z-azure-ad)

### Produkcja

Przed wdrożeniem na produkcję:

1. W Azure Portal zmień Redirect URI na produkcyjny:
   ```
   https://your-domain.com/realms/almadesk/broker/azure-ad/endpoint
   ```

2. Włącz HTTPS w Keycloak

3. Przenieś zmienne do secret managera (nie .env)

4. Przetestuj SSO login i logout

## 🆘 Pomoc

### Najczęstsze problemy

**"Invalid redirect_uri"**
- Sprawdź czy Redirect URI w Azure dokładnie pasuje do Keycloak
- Kopiuj z: Keycloak Admin → Identity Providers → azure-ad → Redirect URI

**"Missing email claim"**
- Sprawdź czy dodałeś optional claims w Azure (Krok 4)
- Verifikuj w Azure: Token configuration → ID token

**Przycisk Microsoft nie widoczny**
- Sprawdź `AZURE_AD_ENABLED=true` w .env
- Zrestartuj backend i wyczyść cache przeglądarki

### Pełna dokumentacja

Zobacz szczegółową dokumentację: [AZURE_AD_INTEGRATION.md](./AZURE_AD_INTEGRATION.md)

### Wsparcie

- Issues: [GitHub Issues](https://github.com/your-org/almadesk-edu/issues)
- Email: support@almadesk.edu
- Logi Keycloak: `docker logs keycloak -f`

## 📊 Status

- ✅ OIDC/OAuth 2.0 (Azure AD)
- ✅ Mapowanie atrybutów użytkownika
- ✅ Single Sign-On (SSO)
- ✅ Single Logout (SLO)
- ⚠️ SAML 2.0 (konfiguracja manualna - zobacz dokumentację)
- ⚠️ Automatyczne mapowanie ról (wymaga konfiguracji)

---

**Czas konfiguracji**: ~15 minut  
**Poziom trudności**: Średni  
**Wersja**: 1.0.0
