import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export const sendEmail = async (to: string, subject: string, text: string, html?: str) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL!,
    subject,
    text,
    html: html || text,
  }
  
  try {
    await sgMail.send(msg)
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error }
  }
}
