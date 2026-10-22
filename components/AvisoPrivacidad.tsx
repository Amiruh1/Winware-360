/** Aviso de privacidad (Ley N.° 29733 de protección de datos personales y Ley N.° 31814 sobre uso de IA). CU-01 y CU-02. */
export default function AvisoPrivacidad({ abierto = false }: { abierto?: boolean }) {
  return (
    <details className="aviso-privacidad" open={abierto}>
      <summary>Aviso de privacidad</summary>
      <div>
        <p><b>Responsable:</b> Winware S.A.C. Contacto para consultas sobre tus datos: <i>[pendiente: correo de contacto de Winware]</i>.</p>
        <p><b>Qué datos usamos:</b> nombre, correo, documento (DNI o RUC), teléfono y dirección de facturación. Solo los necesarios para darte el servicio.</p>
        <p><b>Para qué:</b> crear tu cuenta, gestionar tus alquileres, pagos y comprobantes, y atender los problemas que reportes.</p>
        <p><b>Inteligencia artificial:</b> para sugerir la prioridad de un reporte solo se analiza la descripción del problema, sin tus datos personales. La prioridad final siempre la confirma una persona de Winware.</p>
        <p><b>Tus derechos:</b> puedes pedir acceder, corregir, cancelar u oponerte al uso de tus datos escribiendo al contacto indicado.</p>
      </div>
    </details>
  );
}
