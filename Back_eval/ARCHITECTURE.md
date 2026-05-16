# Architecture Back_eval

## 1. Requirements

### Functional requirements
- Secure login screen with prefilled `admin / admin`.
- Session persistence in `sessionStorage`.
- Immediate protection against direct URL access without an active session.
- Logout clears session state and redirects to `/login`.
- Data cleaner with one reset button per dependency group.
- Resets must continue even if one deletion fails, while keeping a report.
- Multi-file table import without drag and drop.
- CSV/TSV processing must read files as a stream before converting rows to JSON.
- Excel OpenXML workbooks (`.xlsx`, `.xlsm`, `.xltx`, `.xltm`) must be imported sheet by sheet.
- The workbook format `fichier1` / `fichier2` / `fichier3` maps to products, combinations+stock, then customers/carts/orders.
- ZIP image upload expects one archive containing a folder of images.
- Images are linked to products through the numeric prefix in the filename.
- Orders page must list orders and allow quick status changes through `order_histories`.

### Non-functional requirements
- Clear separation between UI, orchestration logic, and infrastructure.
- Reusable utilities for spreadsheet parsing, ZIP parsing, routing, and logs.
- Scalable flow: fetch only IDs for reset operations, batch file loops, isolate failure handling.
- Keep the codebase extensible for future resource-specific mapping rules.

## 2. Proposed clean architecture

### Presentation layer
- `src/pages/*`: screens and route-level composition.
- `src/components/*`: reusable UI blocks.
- `src/App.tsx`: auth-aware application shell.

### Application layer
- `src/hooks/useBackOffice.ts`: orchestrates user actions and state transitions.
- `src/hooks/useAppRoute.ts`: route guarding and browser navigation sync.
- `src/hooks/backOffice/csv.ts`: CSV/TSV streaming, Excel parsing, delimiter detection, normalization.
- `src/hooks/backOffice/importer.ts`: structured PrestaShop import for the provided workbook format.
- `src/hooks/backOffice/zip.ts`: ZIP extraction and image-to-product resolution.
- `src/hooks/backOffice/orders.ts`: order DTO mapping.

### Domain layer
- `src/hooks/backOffice/types.ts`: shared models and contracts.
- `src/hooks/backOffice/constants.ts`: routes, reset groups, status actions, template hints.

### Infrastructure layer
- `src/services/api.tsx`: raw HTTP helpers and PrestaShop auth header.
- `src/services/backOffice.ts`: resource-level API operations.
- `src/services/xmlParser.js`: XML parsing and generation for PrestaShop payloads.

## 3. Entities / models

- `AppRoute`: `/login | /control | /orders`
- `ResetGroup`: cleaner configuration and dependency order
- `BusyState`: async activity flags by feature
- `LogState`: audit lines by feature
- `OrderItem`: normalized order row for the dashboard
- `OrderStatusAction`: quick action for `order_histories`
- `ZipUpload`: extracted image file plus resolved product ID
- `CsvTemplateHint`: sample CSV structure shown in the UI

## 4. Relationships

- One `ResetGroup` owns many resource names.
- One UI page consumes one or more slices of `BusyState` and `LogState`.
- One ZIP archive folder produces many `ZipUpload` items.
- One order can receive many `OrderStatusAction` updates over time.
- `useBackOffice` coordinates presentation events with infrastructure services.
- `backOffice.ts` depends on `api.tsx` and `xmlParser.js`.

## 5. Folder structure

```text
Back_eval/
  src/
    components/
      ActivityLog.tsx
      CsvDropzone.tsx
      OrdersDashboard.tsx
      ResetPanel.tsx
      UploadCard.tsx
      ZipUploader.tsx
    hooks/
      backOffice/
        constants.ts
        csv.ts
        orders.ts
        types.ts
        zip.ts
      useAppRoute.ts
      useBackOffice.ts
    pages/
      ControlCenter.tsx
      Dashboard.tsx
      Login.tsx
      OrdersPage.tsx
    services/
      api.tsx
      backOffice.ts
      xmlParser.js
```

## 6. Key algorithms

### Route protection
1. Read the current browser pathname.
2. Normalize it to a known route.
3. If the user is not authenticated, force `/login`.
4. If authenticated and the route is `/login`, force `/control`.
5. Keep browser history and UI route in sync.

### Safe cleaner
1. For each group, fetch only resource IDs.
2. Delete resources in the exact dependency order.
3. Skip protected root categories (`1`, `2`).
4. Catch deletion errors per record and continue.
5. Build a per-group execution report.

### Spreadsheet import
1. Read CSV/TSV/TXT files through `file.stream()` and `TextDecoderStream`.
2. Read Excel OpenXML files with `JSZip` and parse each worksheet.
3. Resolve the target resource from the filename, sheet name, or header columns.
4. For the provided workbook, import `fichier1` via `categories`, `taxes`, `tax_rule_groups`, `tax_rules`, and `products`.
5. Import `fichier2` via `product_options`, `product_option_values`, `combinations`, and `stock_availables`.
6. Import `fichier3` via `customers`, `addresses`, `carts`, and `orders`.
7. Fall back to generic resource import for non-matching files.

### ZIP image import
1. Open each ZIP archive with `JSZip`.
2. Traverse the internal image folder and ignore unsupported/system files.
3. Extract the product ID from the filename prefix.
4. Rebuild `File` objects with a valid MIME type.
5. Upload images one by one and log failures without stopping the batch.

### Order status update
1. Select an order in the dashboard.
2. Send a `POST` to `order_histories` with `id_order` and `id_order_state`.
3. Refresh the order list.
4. Append a visual execution log for confirmation.

## Notes / assumptions

- The sample workbook `import-data-mai-26.xlsx` was used to infer spreadsheet examples shown in the UI.
- The import layer is intentionally extensible: if the PrestaShop schema needs richer resource-specific mapping later, the right extension point is `src/hooks/backOffice/csv.ts`.
