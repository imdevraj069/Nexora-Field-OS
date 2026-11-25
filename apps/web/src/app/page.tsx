import { PERMISSION_FLAGS, resolveShardFromOrgId } from '@nexora/shared-types';

export default function HomePage() {
  const sampleOrgId = 'SOL-26-AX65T';
  const sampleShard = resolveShardFromOrgId(sampleOrgId);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Nexora Field OS — Command Center</h1>
      <p style={{ color: '#9fb0cc', marginBottom: '2rem' }}>
        Multi-tenant, shard-routed operations platform with AI governance across Lead, Transit, Field Execution, and Verification.
      </p>

      <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={{ padding: '1.25rem', borderRadius: 12, background: '#131b31', border: '1px solid #243154' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Shard Routing Active</h2>
          <p style={{ color: '#9fb0cc', fontSize: '0.9rem' }}>
            Sample Org: <code>{sampleOrgId}</code> &rarr; <strong>Shard {sampleShard}</strong>
          </p>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: 12, background: '#131b31', border: '1px solid #243154' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Dynamic RBAC Capabilities</h2>
          <p style={{ color: '#9fb0cc', fontSize: '0.9rem' }}>
            {Object.keys(PERMISSION_FLAGS).length} configurable permission flags across Org, Project, Stage, Task &amp; AI scopes.
          </p>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: 12, background: '#131b31', border: '1px solid #243154' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>API Endpoints</h2>
          <p style={{ color: '#9fb0cc', fontSize: '0.9rem' }}>
            GraphQL: <code>/graphql</code> &bull; Auth: <code>/api/v1/auth/*</code> &bull; WS: <code>/socket.io/</code>
          </p>
        </div>
      </section>
    </main>
  );
}
