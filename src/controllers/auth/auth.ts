import { signup } from "./signup.js";
import { signin } from "./signin.js";
import { signout } from "./signout.js";
import { refreshAccess } from "./refreshAccess.js";
import { silentSignIn } from "./silentSignin.js";
import { detatchRefreshToken } from "./refreshTokenHelper.js";
import { reset, confirmReset } from "./resetPassword.js";

/* JWT-based authentication flow

Authentication is based on usage of refresh and access jwt tokens:

- Refresh Token: lasts long time (not infinitely for security reasons). Used to re-issue access tokens, and is supposed to be stored as httpOnly secure cookie on the frontend (managed by browser, not accessible with js)

- Access Token: expires fast, is supposed to be stored only im memory on the frontend

- Refresh API Route: re-issues new access token using valid refresh token, is suppossed to be continuously re-called from the client side

Auth workflow:
client -> request signup/login (provide email and password)
server -> issue new refresh token and access token
client -> request protected server apis with access token
server -> provide resourses until token expires
client (when token expires) -> request access refresh (provide refresh token (handled as http only cookie by browser))
server -> issue new access token ...
*/

// Export functions to be used in other files
export {
  detatchRefreshToken,
  signup,
  signin,
  signout,
  refreshAccess,
  silentSignIn,
  reset,
  confirmReset,
};
