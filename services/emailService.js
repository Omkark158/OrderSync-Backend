// const nodemailer = require('nodemailer');
// const config = require('../config/env');  // ← You already added this

// // Create transporter
// const transporter = nodemailer.createTransport({
//   host: config.email.host,
//   port: config.email.port,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: config.email.user,
//     pass: config.email.password,
//   },
// });

// // Optional: Verify connection on startup
// transporter.verify((error, success) => {
//   if (error) {
//     console.error('Email configuration error:', error);
//   } else {
//     console.log('Email server is ready to send messages');
//   }
// });

// // Your sendOTPEmail function
// exports.sendOTPEmail = async (email, otp, purpose = 'reset') => {
//   let subject, title, introMessage;

//   if (purpose === 'verification') {
//     subject = 'Verify Your Email Address - OrderSync';
//     title = 'Complete Your Registration';
//     introMessage = 'Thank you for signing up! Please use this One-Time Password (OTP) to verify your email and activate your account.';
//   } else {
//     subject = 'Password Reset Request - OrderSync';
//     title = 'Password Reset';
//     introMessage = 'You requested to reset your password. Use the One-Time Password (OTP) below to proceed:';
//   }

//   const mailOptions = {
//     from: config.email.from,
//     to: email,
//     subject,
//     html: `
//       <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: #f9f9f9; border-radius: 12px; border: 1px solid #ddd;">
//         <h1 style="text-align: center; color: #2563eb;">OrderSync</h1>
//         <h2 style="text-align: center; color: #1f2937;">${title}</h2>
        
//         <p style="font-size: 16px; color: #444; text-align: center; line-height: 1.6;">
//           ${introMessage}
//         </p>
        
//         <div style="text-align: center; margin: 40px 0;">
//           <div style="display: inline-block; background: #dbeafe; padding: 20px 40px; border-radius: 12px; font-size: 36px; letter-spacing: 10px; color: #2563eb; font-weight: bold;">
//             ${otp}
//           </div>
//         </div>
        
//         <p style="text-align: center; color: #ef4444; font-weight: bold;">
//           ⚠️ This OTP expires in 10 minutes
//         </p>
        
//         <p style="text-align: center; color: #666; font-size: 14px;">
//           If you didn't request this, please ignore this email.
//         </p>
        
//         <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
        
//         <p style="text-align: center; color: #999; font-size: 12px;">
//           OrderSync - Order Your Favorite Food with Ease<br>
//           This is an automated email. Please do not reply.
//         </p>
//       </div>
//     `,
//   };

//   try {
//     await transporter.sendMail(mailOptions);  // ← This line needs 'transporter' to exist
//     console.log(`OTP email sent to ${email} for ${purpose}`);
//   } catch (error) {
//     console.error('Error sending OTP email:', error);
//     throw new Error('Failed to send email');
//   }
// };