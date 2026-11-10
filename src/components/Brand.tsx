import { Link } from 'react-router-dom';
import mark from '../assets/procureiq.svg';

export function BrandMark({ className }: { className?: string }) {
  return <img src={mark} alt="" width="36" height="36" className={className} />;
}

export default function Brand({
  to = '/',
  className = '',
  dark = false,
  tagline = false
}: {
  to?: string;
  className?: string;
  dark?: boolean;
  tagline?: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label="ProcureIQ"
      className={`inline-flex w-fit items-center gap-2.5 ${dark ? 'text-white' : 'text-navy'} ${className}`}
    >
      <BrandMark className="shrink-0" />
      <span className="block whitespace-nowrap text-xl font-bold leading-none tracking-tight">
        Procure<span className={dark ? 'text-[#a9e2c6]' : 'text-royal'}>IQ</span>
        {tagline && (
          <small className={`mt-1 block text-[9px] font-semibold uppercase tracking-wider ${dark ? 'text-[#b9d5cb]' : 'text-mute'}`}>
            Procurement intelligence
          </small>
        )}
      </span>
    </Link>
  );
}
