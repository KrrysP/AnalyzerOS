# Sample data

AnalyzerOS accepts CSV uploads from the landing page. The file is sent to Supabase Storage; the Next.js server never receives the raw CSV.

## What to use

- A small public CSV is enough to test upload, profiling, and analysis.
- Football match files, e-commerce extracts, or any tabular CSV with a header row will work.
- Do not commit large production or test datasets to this repository.

## What not to commit

- Files with customer PII
- Multi-megabyte dumps
- Anything that cannot be published

If you add a tiny safe example later, keep it in this folder and mention it here.
