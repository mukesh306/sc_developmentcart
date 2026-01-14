const admin = require("firebase-admin");
require("dotenv").config(); 

const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID || "",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCpbcfniamEfCCd\nJRMaHBevnlp8OqUn6vMCvB6izXmByvDWjnyXZTWHg1RRdvultDBoA+3b/o9EyRJW\nKHUbdlXEbSrfjL88if/dj1B/xKoocnR3d1a1MLrTMdo9MEJtlju8w2UImP1G/EfX\nZ9m5o4uGPsM33hUb/537pc7e1zAayWQyN/o4YurRAUYdo04vMRb87GnDlONACSTL\nD/u6eUh/74lO7fwkxedmOxd87B4w8CHlCxENwcYX2ewIPNe+mNSh6nLE6UOCqr/H\nwvG3tx7cvwNDhqN6u+6MVga9MjRyM7GSI8yh/eAwp+ah752krq7oC6DuoLxtx6c4\nzGeWb4efAgMBAAECggEAQEU1Mkc9x1SA2KuyMdLbR1LGF171vI07LtvmsTJJt+sg\nbftyFsodQrEWYKrGbgbK4AIxjiTj+x9dNdK2DbtXcKJKw69z8caViVnumvEi7SHx\nvUnHWgdIr4m3NEPkxwZY1dO3NUo3teBIblVmOa3o5P1U95Hmpw7Rwp6UuWKezGHf\nt5PzPcF2gjNVh8WWq4Z27qVGmRZVFYCH4pkXU1gANCJUtlRM84eu8MYYjmP6GYHt\nXkM5CRroFdd5mSgqIcLy7c33EriGayehLB9dqSnt011uOfN86ALlLzYKcKFgQsae\n6P/LgVDJziWDMorrBInlnlZ+37HQ1+HsT7KB6e9cIQKBgQDdCc/bFn2xHGz09a/M\n9yHD/QrX8iIDMimuvq/HX8aMpfWAQzkPl87nLfauIG6tNyneNwxB+Z8GxgjTt4Oc\nlQ5KoX2+9wOzXni0Snm0jkW0dgChHg8y2DjzPuu3aOmhWuxzPeX+jVLXA+cSDvDm\nxjx4LFDWc7ABQkOsfXyDp2Ha4QKBgQDEOjg4PZqQ7FYqENj9SWjhtKvm4bl+UUtZ\nSUUjb60HTLCm7gzHcLpSyQdO5Z71qz2ZBzjOZ+vul7nBo+dbCJ6OLLcPw4qn2CNQ\n7tCwVBAz25oNkcNC+yTYbH7vI47MmcYps7ek/iOvTe2qyAk3lR0ZOTk/KKbCSePr\nOkV1OKQyfwKBgDe4hn57X/oq6UijOssXrZpjir0/W9Wkap+TkGpZOYsxNv87cwH8\nSfs7OglRQbVGx7Yt+FgVXkJt38HHbFUnui+UIEfoqzUnZpREhgO/LdE9QhFbq4cs\nvMaNIQzeVK8JZbvzaaxO4gg0Aqcpvw7eAFZnDYXSKhdXJgowpBfoNSHhAoGAW0qi\nwTeX43iwlZ2E9kHi8670ktPNUsFLhtyZt+TK4SyCuwbhFyCQ7tbr+X7Gt5DVdY5w\nlUav8y7PkxFIH4ghDBAtkr3ski3yMEMLAB3788RlJY79AvqIp8/CNkuasgGQufIM\nrEw4GeTtf5jVAPD0urlusr2c56Ms0FEp42FYss0CgYEAmZjVByBTOVHFGossa70S\nJU1nruO1atVbKQ9sVzx2wql8alVcSWb/Rie7+hNq89ME2Db8ufcErjLKwdpBF27Q\nNswNQigHIHwkzLmVglazNEabFcBQUq0sCp9fQJD15vFPQCDky7hpx6PR7gnfi7AV\nZVhqSO6Q7XKZ66WyfKyAh+g=\n-----END PRIVATE KEY-----\n",
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID || "",
   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL || ""
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
