import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, GlassPanel, ToggleChip } from '@bingo/ui';
import { api } from '@/lib/api';
import { loadAuth, saveAuth } from '@/lib/session';

export function LoginPage() {
  const navigate = useNavigate();
  const existingAuth = useMemo(() => loadAuth(), []);
  const [mode, setMode] = useState<'login' | 'tenant'>(existingAuth ? 'login' : 'tenant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [loginForm, setLoginForm] = useState({
    email: existingAuth?.user.email ?? '',
    password: '',
  });
  const [tenantForm, setTenantForm] = useState({
    tenantName: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
  });

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      const auth = await api.login(loginForm);
      saveAuth(auth);
      navigate('/app');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      const auth = await api.createTenant(tenantForm);
      saveAuth(auth);
      navigate('/app');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nao foi possivel criar o tenant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="noise-layer relative min-h-screen overflow-hidden px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section>
          <p className="m-0 text-sm uppercase tracking-[0.34em] text-[var(--muted-text)]">
            Bingo Familiar Premium
          </p>
          <h1 className="m-0 mt-5 max-w-3xl font-display text-[clamp(3rem,7vw,6rem)] leading-[0.92] text-gradient">
            O painel cinematografico para o bingo mais divertido da sua festa.
          </h1>
          <p className="m-0 mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-text)]">
            Controle salas, telão, cartelas digitais, quase-bingo, narrador automático e celebrações
            em tempo real com cara de SaaS premium pronto para vender assinaturas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-full bg-white/8 px-4 py-3 text-sm font-semibold text-[var(--text-color)]">
              Globo fisico + painel inteligente
            </div>
            <div className="rounded-full bg-white/8 px-4 py-3 text-sm font-semibold text-[var(--text-color)]">
              Mobile, tablet, telão e Smart TV
            </div>
            <div className="rounded-full bg-white/8 px-4 py-3 text-sm font-semibold text-[var(--text-color)]">
              Multi-tenant sem billing no v1
            </div>
          </div>
        </section>

        <GlassPanel className="rounded-[38px] p-6 md:p-8">
          <div className="flex gap-3">
            <ToggleChip active={mode === 'login'} onClick={() => setMode('login')}>
              Entrar
            </ToggleChip>
            <ToggleChip active={mode === 'tenant'} onClick={() => setMode('tenant')}>
              Criar organizacao
            </ToggleChip>
          </div>

          {mode === 'login' ? (
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <h2 className="m-0 font-display text-3xl text-[var(--text-color)]">Painel do anfitriao</h2>
              <p className="m-0 text-sm text-[var(--muted-text)]">
                Entre com a conta criada para a sua organizacao.
              </p>
              <Field
                label="Email"
                value={loginForm.email}
                onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))}
              />
              <Field
                label="Senha"
                type="password"
                value={loginForm.password}
                onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
              />
              {error ? <p className="m-0 text-sm text-rose-300">{error}</p> : null}
              <Button className="w-full py-4 text-base" disabled={loading} type="submit">
                {loading ? 'Entrando...' : 'Entrar no comando'}
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleCreateTenant}>
              <h2 className="m-0 font-display text-3xl text-[var(--text-color)]">Criar tenant SaaS</h2>
              <p className="m-0 text-sm text-[var(--muted-text)]">
                Primeiro uso: crie a organizacao e o anfitriao principal.
              </p>
              <Field
                label="Organizacao"
                value={tenantForm.tenantName}
                onChange={(value) => setTenantForm((current) => ({ ...current, tenantName: value }))}
              />
              <Field
                label="Slug"
                value={tenantForm.slug}
                onChange={(value) => setTenantForm((current) => ({ ...current, slug: value }))}
              />
              <Field
                label="Nome do owner"
                value={tenantForm.ownerName}
                onChange={(value) => setTenantForm((current) => ({ ...current, ownerName: value }))}
              />
              <Field
                label="Email do owner"
                value={tenantForm.ownerEmail}
                onChange={(value) => setTenantForm((current) => ({ ...current, ownerEmail: value }))}
              />
              <Field
                label="Senha"
                type="password"
                value={tenantForm.password}
                onChange={(value) => setTenantForm((current) => ({ ...current, password: value }))}
              />
              {error ? <p className="m-0 text-sm text-rose-300">{error}</p> : null}
              <Button className="w-full py-4 text-base" disabled={loading} type="submit">
                {loading ? 'Criando...' : 'Criar organizacao'}
              </Button>
            </form>
          )}
        </GlassPanel>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-text)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[22px] border border-white/10 bg-[var(--surface-strong)] px-4 py-4 text-base text-[var(--text-color)] outline-none"
      />
    </label>
  );
}
