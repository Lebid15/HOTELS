// رأس السايدبار الموحّد: شعار المنصّة (أو حرف بديل) + الاسم + الوصف.
// يُستخدم في كل الواجهات (المدير/الاستقبال/صاحب المنصّة) لضمان هوية واحدة أعلى القائمة.

interface Props {
  logo: string;
  name: string;
  description: string;
}

export default function SidebarBrand({ logo, name, description }: Props) {
  const letter = (name || "F").charAt(0).toUpperCase();
  return (
    <div className="sidebar-header">
      {logo ? (
        <span className="pf-logo-frame">
          {/* eslint-disable-next-line @next/next/no-img-element -- شعار المنصّة (رابط خارجي) */}
          <img src={logo} alt={name} />
        </span>
      ) : (
        <div className="sidebar-brand-mark">{letter}</div>
      )}
      <div className="sidebar-brand-meta">
        <p className="sidebar-brand-title">{name}</p>
        <p className="sidebar-brand-sub">{description}</p>
      </div>
    </div>
  );
}
