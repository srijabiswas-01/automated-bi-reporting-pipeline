# Private operational snapshot

Apps Script GitHubSync.gs automatically writes snapshot.json.gz here after setup. It contains operational business records, including customers and audit references. Use a **private** repository and restrict access. The exporter refuses public repositories.

Do not manually edit the compressed file. Each export is one complete, lock-protected snapshot with a format version, UTC export timestamp and source revision. GitHub Actions validates its freshness, structure and business relationships before loading newer source versions into Neon. Actual snapshots must be tracked in this private repository so changes trigger the workflow.

This folder contains no credentials. Put the GitHub personal access token in Apps Script Script Properties and the direct Neon database URL in GitHub Actions Secrets. Snapshot versions remain in private Git history; removing a record from the latest snapshot does not remove past copies.
