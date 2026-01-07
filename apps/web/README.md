# Weather Station Web (Next.js static export)

Static dashboard showing mocked latest readings and recent history. Uses shared `@weathera/contracts` types.

## Commands

```bash
npm install      # install deps
npm run dev      # start dev server
npm run build    # static export
npm start        # serve ./out (after build)
```

## Notes

- All data is mocked for now. Swap to API fetch once backend is ready.
- Styling lives in `app/layout.tsx`; main UI in `app/page.tsx`.
- `output: "export"` enables static export.
