# 📚 AlmaDesk-Edu - CSS Structure Guide

## Struktura plików CSS

```
styles/
├── variables.css      # Zmienne CSS (kolory, spacing, fonts)
├── global.css         # Globalne style i reset
├── components.css     # 🆕 Zunifikowane klasy komponentów
├── themes/            # Motywy kolorystyczne
│   ├── default.css
│   ├── university-blue.css
│   ├── corporate-dark.css
│   └── forest-green.css
└── components/        # Specyficzne style dla komponentów
    ├── LoginPage.css
    ├── DashboardLayout.css
    └── ...
```

## 🎯 Zunifikowane klasy (components.css)

### Przyciski

```jsx
// Podstawowy przycisk
<button className="btn btn-primary">Zapisz</button>

// Warianty
<button className="btn btn-secondary">Anuluj</button>
<button className="btn btn-success">Zatwierdź</button>
<button className="btn btn-error">Usuń</button>
<button className="btn btn-outline">Wróć</button>

// Rozmiary
<button className="btn btn-primary btn-sm">Mały</button>
<button className="btn btn-primary btn-lg">Duży</button>

// Przycisk powrotu
<button className="btn-back" onClick={() => navigate(-1)}>
  ← Wróć
</button>
```

### Karty

```jsx
// Podstawowa karta
<div className="card">
  <h3 className="card-title">Tytuł karty</h3>
  <p>Treść karty</p>
</div>

// Karta z hover
<div className="card card-hover">...</div>

// Karta z bordrem
<div className="card card-bordered">...</div>

// Karta statystyk
<div className="card-stat">...</div>
```

### Formularze

```jsx
// Pole tekstowe
<div className="form-group">
  <label className="form-label">Imię i nazwisko</label>
  <input type="text" className="input" />
  <span className="form-hint">Wprowadź pełne imię i nazwisko</span>
</div>

// Pole tekstowe z błędem
<input type="text" className="input form-control error" />
<span className="form-error">To pole jest wymagane</span>

// Textarea
<textarea className="textarea" rows="5"></textarea>

// Select
<select className="select">
  <option>Wybierz opcję</option>
</select>

// Forma row (responsive grid)
<div className="form-row">
  <div className="form-group">...</div>
  <div className="form-group">...</div>
</div>
```

### Layouty Grid

```jsx
// Auto-fit grid (responsive)
<div className="grid-auto-fit">
  <div className="card">...</div>
  <div className="card">...</div>
  <div className="card">...</div>
</div>

// Fixowane kolumny
<div className="grid-2-col">...</div>
<div className="grid-3-col">...</div>
<div className="grid-4-col">...</div>
```

### Animacje

```jsx
// Hover lift
<div className="card hover-lift">...</div>

// Hover scale
<button className="btn hover-scale">Kliknij</button>

// Animacje
<div className="animate-fade-in">Fade in przy załadowaniu</div>
<div className="loading-spinner animate-spin"></div>
<div className="badge animate-pulse">Pilne!</div>
```

### Empty States

```jsx
<div className="empty-state">
  <div className="empty-state-icon">
    <Icon name="inbox" size={64} />
  </div>
  <h3 className="empty-state-title">Brak zgłoszeń</h3>
  <p className="empty-state-description">
    Nie masz jeszcze żadnych zgłoszeń
  </p>
  <button className="btn btn-primary">Utwórz zgłoszenie</button>
</div>
```

### Loading State

```jsx
<div className="loading-state">
  <div className="loading-spinner"></div>
  <p className="loading-text">Ładowanie danych...</p>
</div>
```

### Badges

```jsx
// Statusy
<span className="badge-status open">Otwarte</span>
<span className="badge-status in-progress">W trakcie</span>
<span className="badge-status closed">Zamknięte</span>

// Priorytety
<span className="badge-priority low">Niski</span>
<span className="badge-priority medium">Średni</span>
<span className="badge-priority high">Wysoki</span>
<span className="badge-priority critical">Krytyczny</span>

// Podstawowe
<span className="badge badge-primary">Admin</span>
<span className="badge badge-success">Aktywny</span>
<span className="badge badge-error">Błąd</span>
```

### Tabele

```jsx
<table className="table table-hover table-sticky-header">
  <thead>
    <tr>
      <th>ID</th>
      <th>Tytuł</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>#1234</td>
      <td>Problem z logowaniem</td>
      <td><span className="badge-status open">Otwarte</span></td>
    </tr>
  </tbody>
</table>
```

### Tytuły

```jsx
// Tytuł strony (biały, na gradiencie)
<h1 className="page-title">
  <Icon name="dashboard" size={32} />
  Dashboard
</h1>

// Tytuł sekcji
<h2 className="section-title">
  <Icon name="ticket" size={24} />
  Moje zgłoszenia
</h2>

// Tytuł karty
<h3 className="card-title">
  <Icon name="info" size={20} />
  Szczegóły
</h3>
```

### Info Boxes

```jsx
<div className="info-box info">
  <Icon name="info" size={20} />
  <div>
    <h4>Informacja</h4>
    <p>To jest komunikat informacyjny</p>
  </div>
</div>

<div className="info-box success">...</div>
<div className="info-box warning">...</div>
<div className="info-box error">...</div>
```

### Utility Classes

```jsx
// Flex
<div className="flex gap-md">...</div>
<div className="flex-col gap-lg">...</div>
<div className="flex-between">...</div>
<div className="flex-center">...</div>

// Spacing
<div className="mt-lg mb-xl p-md">...</div>

// Text
<p className="text-center text-muted">Wyśrodkowany tekst</p>
<p className="text-error font-bold">Błąd!</p>

// Shadow
<div className="card shadow-lg">...</div>

// Border radius
<div className="rounded-lg">...</div>

// Width
<div className="w-full">...</div>
```

## 🔧 Kiedy używać zunifikowanych klas?

### ✅ UŻYWAJ zunifikowanych klas:
- Nowe komponenty i strony
- Przyciski, formularze, karty
- Layouty grid i flex
- Ogólne animacje hover
- Empty states i loading
- Badges i statusy

### ❌ NIE używaj (zostaw w lokalnym CSS):
- Bardzo specyficzne style dla konkretnego komponentu
- Niestandardowe layouty, które nie pasują do siatki
- Złożone animacje specyficzne dla jednego miejsca
- Style, które łamią ogólny design system

## 📝 Przykład migracji

### Przed (stare podejście):
```jsx
// LoginPage.jsx
<button className="login-button">Zaloguj</button>

// LoginPage.css
.login-button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
}
```

### Po (zunifikowane):
```jsx
// LoginPage.jsx
<button className="btn btn-primary">Zaloguj</button>

// LoginPage.css - usuń duplikat, zostaw tylko specyficzne style
```

## 🎨 Zmienne CSS (variables.css)

Wszystkie zunifikowane klasy używają zmiennych z `variables.css`:

```css
/* Kolory */
--color-primary
--color-success
--color-error
--color-warning
--color-info

/* Spacing */
--spacing-xs    /* 0.5rem */
--spacing-sm    /* 0.75rem */
--spacing-md    /* 1rem */
--spacing-lg    /* 1.5rem */
--spacing-xl    /* 2rem */

/* Border Radius */
--radius-sm     /* 6px */
--radius-md     /* 8px */
--radius-lg     /* 12px */
--radius-full   /* 9999px */

/* Shadows */
--shadow-sm
--shadow-md
--shadow-lg

/* Transitions */
--transition-fast
--transition-normal
--transition-slow
```

## 🚀 Korzyści z refaktoryzacji

- ✅ **~800-1000 linii CSS mniej** w całym projekcie
- ✅ **Spójny wygląd** wszystkich komponentów
- ✅ **Łatwiejsze utrzymanie** - jedna zmiana = wszędzie
- ✅ **Szybszy development** - gotowe klasy do użycia
- ✅ **Lepszy DX** - czytelniejszy kod komponentów

## 📦 Następne kroki (opcjonalne)

1. **Stopniowa migracja** - Zacznij od nowych komponentów
2. **Refaktoryzacja istniejących** - Podmień duplikaty w plikach CSS
3. **Dokumentacja** - Dodaj komentarze w kodzie
4. **Storybook** (przyszłość) - Wizualna dokumentacja komponentów

---

**Ostatnia aktualizacja:** 10.02.2026  
**Wersja CSS:** 2.0 (zunifikowana)
