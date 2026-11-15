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

### 5. Configurar las variables de entorno
1. Copia `.env.example` a `.env.local`
2. Llena los valores:

```bash
# .env.local (y las mismas variables en Vercel → Settings → Environment Variables)
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=abc123xyz789
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gmail123
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_contacto456
```

### Notas importantes:
- El plan gratuito permite 200 emails por mes
- Los emails se enviarán directamente a creciendofelizabc@gmail.com
- El formulario tiene protección anti-spam: solo permite un envío por sesión del navegador
- Los usuarios pueden limpiar su localStorage si necesitan enviar otro mensaje (pero esto evita spam automático)

