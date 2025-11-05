# Configuración de EmailJS para el Formulario de Contacto

## Pasos para configurar EmailJS:

### 1. Crear cuenta en EmailJS
1. Ve a https://www.emailjs.com/
2. Crea una cuenta gratuita (permite hasta 200 emails/mes)

### 2. Crear un servicio de email
1. Ve a "Email Services" en el dashboard
2. Haz clic en "Add New Service"
3. Selecciona tu proveedor de email (Gmail, Outlook, etc.)
4. Conecta tu cuenta de Gmail (creciendofelizabc@gmail.com)
5. Copia el **Service ID** generado

### 3. Crear un template de email
1. Ve a "Email Templates" en el dashboard
2. Haz clic en "Create New Template"
3. Usa el siguiente formato para el template:

**Asunto:**
```
Nuevo mensaje de contacto - {{from_name}}
```

**Contenido del email:**
```
Has recibido un nuevo mensaje del formulario de contacto:

Nombre: {{from_name}}
Email: {{from_email}}
Teléfono: {{phone}}
Mensaje:
{{message}}

---
Este mensaje fue enviado desde el sitio web de la Fundación Creciendo Feliz.
```

4. Guarda el template y copia el **Template ID**

### 4. Obtener tu Public Key
1. Ve a "Account" en el dashboard
2. En "General", encontrarás tu **Public Key** (también llamada API Key)

### 5. Actualizar el código
1. Abre `src/pages/Contactenos.js`
2. En la línea 94-98, reemplaza:
   - `'YOUR_SERVICE_ID'` con tu Service ID
   - `'YOUR_TEMPLATE_ID'` con tu Template ID
   - `'YOUR_PUBLIC_KEY'` con tu Public Key

### Ejemplo:
```javascript
const response = await emailjs.send(
  'service_abc123',      // Tu Service ID
  'template_xyz789',     // Tu Template ID
  templateParams,
  'abcdefghijklmnop'    // Tu Public Key
);
```

### Notas importantes:
- El plan gratuito permite 200 emails por mes
- Los emails se enviarán directamente a creciendofelizabc@gmail.com
- El formulario tiene protección anti-spam: solo permite un envío por sesión del navegador
- Los usuarios pueden limpiar su localStorage si necesitan enviar otro mensaje (pero esto evita spam automático)

