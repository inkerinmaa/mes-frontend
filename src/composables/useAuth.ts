import { ref, computed } from "vue";
import { createSharedComposable } from "@vueuse/core";
import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import { getConfig } from "../config";

const _useAuth = () => {
  const user = ref<User | null>(null);
  const isLoading = ref(true);
  const { authority, clientId } = getConfig();

  const userManager = new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });

  const isAuthenticated = computed(() => !!user.value && !user.value.expired);

  const userName = computed(() => {
    if (!user.value?.profile) return "";
    const p = user.value.profile;
    if (p.given_name && p.family_name)
      return `${p.given_name} ${p.family_name}`;
    return p.name || p.preferred_username || "";
  });

  const userEmail = computed(() => user.value?.profile?.email || "");

  async function initialize(): Promise<void> {
    try {
      const existingUser = await userManager.getUser();
      if (existingUser && !existingUser.expired) {
        user.value = existingUser;
      }
    } catch (e) {
      console.error("Auth initialization failed:", e);
    } finally {
      isLoading.value = false;
    }
  }

  async function login(): Promise<void> {
    await userManager.signinRedirect();
  }

  async function handleCallback(): Promise<void> {
    const callbackUser = await userManager.signinRedirectCallback();
    user.value = callbackUser;
  }

  async function logout(): Promise<void> {
    localStorage.removeItem('mes_role');
    localStorage.removeItem('mes_user_id');
    await userManager.signoutRedirect();
  }

  function getAccessToken(): string | undefined {
    return user.value?.access_token;
  }

  userManager.events.addUserLoaded((renewedUser) => {
    user.value = renewedUser;
  });

  userManager.events.addUserUnloaded(() => {
    user.value = null;
  });

  userManager.events.addSilentRenewError((error) => {
    console.error("Silent renew error:", error);
  });

  return {
    user,
    isLoading,
    isAuthenticated,
    userName,
    userEmail,
    initialize,
    login,
    logout,
    handleCallback,
    getAccessToken,
  };
};

export const useAuth = createSharedComposable(_useAuth);
