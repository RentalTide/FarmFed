# FarmFed - Sharetribe Web Template Project

## Overview

FarmFed is a marketplace application built on the **Sharetribe Web Template** (v10.8.0). It uses React 18, Redux Toolkit, Express.js for SSR, and the Sharetribe Flex SDK to power marketplace functionality including listings, transactions, payments (Stripe), and messaging.

**Docs**: https://www.sharetribe.com/docs/

---

## Project Structure

```
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components (97 directories)
│   ├── containers/               # Page-level components with Redux
│   ├── config/                   # Marketplace configuration
│   ├── ducks/                    # Global Redux state (duck pattern)
│   ├── routing/                  # Route definitions & code-splitting
│   ├── styles/                   # Global CSS variables & media queries
│   ├── transactions/             # Transaction process definitions (JS)
│   ├── translations/             # i18n (en, de, es, fr)
│   ├── context/                  # React Context providers
│   ├── analytics/                # Analytics handlers
│   ├── util/                     # Utility modules (38 files)
│   ├── store.js                  # Redux store setup
│   ├── reducers.js               # Root reducer (combines global + page ducks)
│   └── index.js                  # Entry point
├── server/                       # Express backend (SSR, API proxy, auth)
│   ├── api/                      # API endpoints (auth, transactions, pricing)
│   └── api-util/                 # Server utilities (SDK, line items, cache)
├── ext/                          # Transaction process definitions (EDN format)
│   └── transaction-processes/    # booking, purchase, negotiation, inquiry
├── public/                       # Static assets
├── scripts/                      # Build utilities
└── patches/                      # Dependency patches (patch-package)
```

---

## Key Conventions

### Component Structure

Each component lives in its own PascalCase directory:

```
src/components/Button/
├── Button.js                 # Component implementation
├── Button.module.css         # Scoped CSS Module
└── Button.example.js         # Styleguide examples (optional)
```

**Patterns used in components:**
- Functional components with hooks (no class components)
- `import css from './Component.module.css'` for scoped styles
- `classNames` library for conditional class composition
- `rootClassName` prop for parent style overrides, `className` for additions
- Component variants exported as named exports with `.displayName`
- Context hooks: `useConfiguration()`, `useRouteConfiguration()`, `useIntl()`

**Component exports** are centralized in `src/components/index.js` (ordered: independent first, composite after to avoid circular deps).

### Container (Page) Structure

Pages live in `src/containers/` with their own duck file:

```
src/containers/ManageListingsPage/
├── ManageListingsPage.js           # Page component
├── ManageListingsPage.duck.js      # Redux state, thunks, selectors
├── ManageListingsPage.module.css   # Styles
└── SubComponent/                   # Page-specific sub-components
```

**Container connection pattern:**
```javascript
export const PageComponent = props => { /* ... */ };

const mapStateToProps = state => ({ /* select from state */ });
const mapDispatchToProps = dispatch => ({ /* dispatch thunks */ });

const Page = compose(connect(mapStateToProps, mapDispatchToProps))(PageComponent);
export default Page;
```

### Adding a New Page

1. Create directory in `src/containers/NewPage/`
2. Create `NewPage.js`, `NewPage.module.css`, `NewPage.duck.js`
3. Add loadable import in `src/routing/routeConfiguration.js`:
   ```javascript
   const NewPage = loadable(() =>
     import(/* webpackChunkName: "NewPage" */ '../containers/NewPage/NewPage')
   );
   ```
4. Add route entry with path, name, component, auth, loadData
5. Register duck reducer in `src/containers/reducers.js`
6. Register loadData in `src/containers/pageDataLoadingAPI.js`
7. Use `<NamedLink name="NewPage">` for internal links (never raw paths)

---

## Styling System

### Two-Level Architecture

1. **Global**: CSS custom properties in `src/styles/marketplaceDefaults.css`
2. **Component**: CSS Modules (`*.module.css`) with scoped class names

### CSS Custom Properties (Theming)

Defined at `:root` in `marketplaceDefaults.css`:

| Variable | Purpose |
|----------|---------|
| `--marketplaceColor` | Primary brand color |
| `--colorPrimaryButton` | Button color |
| `--colorSuccess/Fail/Attention` | Status colors |
| `--fontFamily` | Typography stack |
| `--fontWeightRegular/Medium/Bold` | Font weights |

### Responsive Breakpoints

Defined in `src/styles/customMediaQueries.css`:

```css
@custom-media --viewportSmall (min-width: 550px);
@custom-media --viewportMedium (min-width: 768px);
@custom-media --viewportLarge (min-width: 1024px);
@custom-media --viewportLargeWithPaddings (min-width: 1128px);
@custom-media --viewportXLarge (min-width: 1921px);
```

Usage in component CSS:
```css
@import '../../styles/customMediaQueries.css';

.title {
  font-size: 20px;
  @media (--viewportMedium) {
    font-size: 28px;
  }
}
```

### CSS Module Patterns

- Use `composes: buttonDefault from global;` to inherit global utility classes
- Parent components control child spacing via `className` prop
- Typography and layout follow 6px (mobile) / 8px (desktop) baselines
- Class names in browser become `ComponentName_className__hash` (useful for debugging)

### Branding

Edit `src/config/configBranding.js` for logos, marketplace color, and social images. These can be overridden by hosted config from Sharetribe Console.

---

## State Management (Redux)

### Duck Pattern

Each duck file (`*.duck.js`) contains:
- Initial state
- `createSlice` with reducers and extraReducers
- `createAsyncThunk` for API calls
- Selectors for derived state
- Backward-compatible wrapper functions

### SDK Access

The Sharetribe SDK is passed as `extraArgument` to thunk middleware:

```javascript
const myThunk = createAsyncThunk('page/action', (params, { extra: sdk }) => {
  return sdk.listings.query(params);
});

// Backward-compatible wrapper:
export const myAction = params => (dispatch, getState, sdk) => {
  return dispatch(myThunk(params)).unwrap();
};
```

### Store Architecture

- **Global ducks** (`src/ducks/`): auth, user, ui, stripe, marketplaceData, hostedAssets, routing, paymentMethods, emailVerification
- **Page ducks** (`src/containers/*/PageName.duck.js`): page-specific state
- Combined in `src/reducers.js` — state clears on logout

---

## Configuration System

### Local Config (`src/config/`)

| File | Purpose |
|------|---------|
| `configDefault.js` | Root config, imports all others |
| `configBranding.js` | Logo, colors, social images |
| `configListing.js` | Listing types, extended data fields |
| `configUser.js` | User extended data fields |
| `configSearch.js` | Search filters, sort options |
| `configMaps.js` | Map provider (Mapbox/Google) |
| `configStripe.js` | Payment countries |
| `configLayout.js` | Page layouts, aspect ratios |
| `configAnalytics.js` | Analytics config |

### Hosted Config (Sharetribe Console)

Settings from Console's Asset Delivery API **override** local config. Access via:
```javascript
const config = useConfiguration();
```

### Environment Variables

Set in `.env` files. Key variables:
- `REACT_APP_SHARETRIBE_SDK_CLIENT_ID`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `REACT_APP_MAPBOX_ACCESS_TOKEN`
- `REACT_APP_MARKETPLACE_ROOT_URL`
- `REACT_APP_MARKETPLACE_NAME`

---

## Transaction Processes

### Definition (Backend/EDN)

Process state machines defined in `ext/transaction-processes/`:
- `default-booking` — time-based bookings with accept/decline
- `default-purchase` — item purchases with shipping
- `default-negotiation` — price negotiation with counter-offers
- `default-inquiry` — simple messaging/inquiries

Each has a `process.edn` file (Clojure-like format) defining states, transitions, actors, and actions.

### Frontend Integration

`src/transactions/transaction.js` maps processes to frontend helpers:
- State checking functions (is transaction pending? accepted? etc.)
- Process registry with unit types
- Transition name constants

Each process has a dedicated file (e.g., `transactionProcessBooking.js`) exporting transitions, states, and state-graph descriptions.

---

## Routing

### Route Configuration

All routes defined in `src/routing/routeConfiguration.js`:

```javascript
{
  path: '/l/:slug/:id',
  name: 'ListingPage',
  component: ListingPage,
  loadData: pageDataLoadingAPI.ListingPage.loadData,
}
```

### Navigation

- Use `<NamedLink name="ListingPage" params={{slug, id}}>` for internal links
- Use `<NamedRedirect>` for redirects
- Use `<ExternalLink>` for external URLs

### Code Splitting

Pages are lazy-loaded via `@loadable/component`. Preloading happens on link hover and via `enforcePagePreloadFor` prop on buttons.

---

## Translations (i18n)

### Structure

Translation files in `src/translations/`: `en.json`, `de.json`, `es.json`, `fr.json`

### Usage

```javascript
import { useIntl } from '../../util/reactIntl';

const MyComponent = () => {
  const intl = useIntl();
  return <p>{intl.formatMessage({ id: 'MyComponent.title' })}</p>;
};
```

Translation keys follow the pattern: `PageOrComponent.descriptiveKey`

---

## Server (`server/`)

- **Express.js** with SSR via `server/renderer.js`
- **API proxy** routes in `server/apiRouter.js` for privileged operations
- **Auth**: Passport.js with Facebook/Google OAuth
- **Line items**: Custom pricing logic in `server/api-util/lineItems.js`
- **CSP**: Content Security Policy headers in `server/csp.js`
- **Resources**: Dynamic `robots.txt`, `sitemap.xml`, `webmanifest`

---

## Testing

### Patterns

- **Framework**: Jest + React Testing Library
- **Location**: Test files co-located as `*.test.js`
- **Utilities**: `src/util/testHelpers.js` provides `renderWithProviders`, mock configs
- **Test data**: `src/util/testData.js` has factory functions (`createUser`, `createListing`, `createTransaction`, etc.)
- **Run**: `yarn run test` (watch mode) or `yarn run test-ci` (CI mode)

### Container Test Pattern

```javascript
import { renderWithProviders as render, getDefaultConfiguration } from '../../util/testHelpers';
import { createCurrentUser, createListing } from '../../util/testData';

describe('MyPage', () => {
  it('renders correctly', () => {
    const props = { currentUser: createCurrentUser('user-1'), /* ... */ };
    render(<MyPageComponent {...props} />, { config: getDefaultConfiguration() });
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

---

## Development Workflow

```bash
yarn run dev              # Start frontend (3000) + backend (3500) concurrently
yarn run dev-frontend     # Frontend only
yarn run dev-backend      # Backend only (with nodemon)
yarn run build            # Production build
yarn run test             # Run tests in watch mode
yarn run translate        # Check translation completeness
yarn run config           # Guided env variable setup
```

---

## Best Practices

- **Read before modifying**: Always understand existing code before making changes
- **Follow existing patterns**: Use the same component/duck/CSS module structure
- **CSS Modules over global styles**: Keep styles scoped to components
- **NamedLink over raw paths**: Enables path changes without updating every link
- **SDK via thunks**: Always access Sharetribe SDK through Redux thunks (extraArgument)
- **Hosted config precedence**: Local config is overridden by Console settings
- **No direct DOM selectors in CSS**: Use semantic class names
- **Parent controls child layout**: Parents pass className for spacing/positioning
- **Keep presentational components Redux-free**: Only containers connect to Redux
