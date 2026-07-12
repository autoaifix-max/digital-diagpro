const readinessChecks = [
  "Next.js App Router",
  "TypeScript",
  "Tailwind CSS",
  "واجهة عربية RTL",
];

export default function Home() {
  return (
    <main className="app-shell">
      <section className="verification-card" aria-labelledby="product-title">
        <div className="status-row" aria-label="حالة المرحلة">
          <span className="status-dot" aria-hidden="true" />
          <span>الأساس التقني جاهز</span>
        </div>

        <div className="heading-group">
          <p className="version-label">Pilot V1</p>
          <h1 id="product-title">Digital DiagPro OS</h1>
          <p className="product-description">
            نظام التشغيل الرقمي لمركز التشخيص الاحترافي
          </p>
        </div>

        <div className="divider" aria-hidden="true" />

        <ul className="readiness-list" aria-label="مكونات الأساس التقني">
          {readinessChecks.map((check) => (
            <li key={check}>
              <span className="check-mark" aria-hidden="true">
                ✓
              </span>
              <span>{check}</span>
            </li>
          ))}
        </ul>

        <p className="scope-note">
          مرحلة تأسيس تقنية فقط — لم يتم ربط قاعدة البيانات أو تنفيذ وظائف التشغيل.
        </p>
      </section>
    </main>
  );
}
