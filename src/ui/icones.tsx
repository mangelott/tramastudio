import type { SVGProps } from 'react'

/** Ícones de traço, desenhados para 24 px. Herdam a cor do texto. */
const caminhos = {
  hoje: <><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M10 20v-6h4v6" /></>,
  clientes: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></>,
  visitas: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  calculadora: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></>,
  sync: <><path d="M20 12a8 8 0 0 1-14 5.3M4 12A8 8 0 0 1 18 6.7" /><path d="M18 3v4h-4M6 21v-4h4" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  certo: <path d="M5 12.5 10 17l9-10" />,
  direita: <path d="M5 12h14M13 6l6 6-6 6" />,
  esquerda: <path d="M19 12H5M11 6l-6 6 6 6" />,
  local: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  imagem: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-5-5-8 8" /></>,
  cadeado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  documento: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  pesquisa: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 7 8.5-7" /></>,
  telefone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  apagar: <><path d="M9 6h11v12H9l-6-6z" /><path d="m12 9.5 5 5M17 9.5l-5 5" /></>,
  lixo: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  backoffice: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  sair: <><path d="M14 4h5v16h-5" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
} as const

export type NomeIcone = keyof typeof caminhos

export function Icone({
  nome,
  tamanho = 24,
  traco = 1.75,
  ...props
}: { nome: NomeIcone; tamanho?: number; traco?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {caminhos[nome]}
    </svg>
  )
}
