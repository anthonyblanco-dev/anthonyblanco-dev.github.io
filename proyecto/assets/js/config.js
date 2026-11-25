/* Configuración del formulario de contacto (EmailJS, https://www.emailjs.com).
   1. Crea una cuenta gratuita y conecta tu Gmail en "Email Services" -> copia el Service ID.
   2. En "Email Templates" crea una plantilla con las variables:
        {{from_name}}  {{business}}  {{need}}  {{reply_to}}  {{message}}  {{lang}}
      y pon "To Email" = {{to_email}} (o tu correo) y "Reply To" = {{reply_to}}. Copia el Template ID.
   3. En "Account" copia tu Public Key.
   La Public Key es pública por diseño: puede ir en el repositorio.
   Mientras estén vacías, el formulario abre tu correo con el mensaje ya armado (mailto). */
window.AB_CONFIG = {
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: "",
  },
};

/* CV en inglés: cuando subas assets/cv/CV_Imagen_Anthony_Blanco_EN.pdf, cambia a true
   y el botón descargará esa versión al ver el sitio en inglés. */
window.AB_CONFIG.cvEn = false;
