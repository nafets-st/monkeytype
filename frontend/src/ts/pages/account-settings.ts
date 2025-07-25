import { PageWithUrlParams } from "./page";
import * as Skeleton from "../utils/skeleton";
import { getAuthenticatedUser, isAuthenticated } from "../firebase";
import * as ActivePage from "../states/active-page";
import { swapElements } from "../utils/misc";
import { getSnapshot } from "../db";
import Ape from "../ape";
import * as StreakHourOffsetModal from "../modals/streak-hour-offset";
import * as Loader from "../elements/loader";
import * as ApeKeyTable from "../elements/account-settings/ape-key-table";
import * as Notifications from "../elements/notifications";
import { z } from "zod";

const pageElement = $(".page.pageAccountSettings");

const StateSchema = z.object({
  tab: z.enum(["authentication", "account", "apeKeys", "dangerZone"]),
});
type State = z.infer<typeof StateSchema>;

const UrlParameterSchema = StateSchema.partial();

const state: State = {
  tab: "account",
};

function updateAuthenticationSections(): void {
  pageElement.find(".section.passwordAuthSettings button").addClass("hidden");
  pageElement.find(".section.googleAuthSettings button").addClass("hidden");
  pageElement.find(".section.githubAuthSettings button").addClass("hidden");

  if (!isAuthenticated()) return;
  const user = getAuthenticatedUser();

  const passwordProvider = user.providerData.some(
    (provider) => provider.providerId === "password"
  );
  const googleProvider = user.providerData.some(
    (provider) => provider.providerId === "google.com"
  );
  const githubProvider = user.providerData.some(
    (provider) => provider.providerId === "github.com"
  );

  if (passwordProvider) {
    pageElement
      .find(".section.passwordAuthSettings #emailPasswordAuth")
      .removeClass("hidden");
    pageElement
      .find(".section.passwordAuthSettings #passPasswordAuth")
      .removeClass("hidden");
    if (googleProvider || githubProvider) {
      pageElement
        .find(".section.passwordAuthSettings #removePasswordAuth")
        .removeClass("hidden");
    }
  } else {
    pageElement
      .find(".section.passwordAuthSettings #addPasswordAuth")
      .removeClass("hidden");
  }

  if (googleProvider) {
    pageElement
      .find(".section.googleAuthSettings #removeGoogleAuth")
      .removeClass("hidden");
    if (passwordProvider || githubProvider) {
      pageElement
        .find(".section.googleAuthSettings #removeGoogleAuth")
        .removeClass("disabled");
    } else {
      pageElement
        .find(".section.googleAuthSettings #removeGoogleAuth")
        .addClass("disabled");
    }
  } else {
    pageElement
      .find(".section.googleAuthSettings #addGoogleAuth")
      .removeClass("hidden");
  }
  if (githubProvider) {
    pageElement
      .find(".section.githubAuthSettings #removeGithubAuth")
      .removeClass("hidden");
    if (passwordProvider || googleProvider) {
      pageElement
        .find(".section.githubAuthSettings #removeGithubAuth")
        .removeClass("disabled");
    } else {
      pageElement
        .find(".section.githubAuthSettings #removeGithubAuth")
        .addClass("disabled");
    }
  } else {
    pageElement
      .find(".section.githubAuthSettings #addGithubAuth")
      .removeClass("hidden");
  }
}

function updateIntegrationSections(): void {
  //no code and no discord
  if (!isAuthenticated()) {
    pageElement.find(".section.discordIntegration").addClass("hidden");
  } else {
    if (!getSnapshot()) return;
    pageElement.find(".section.discordIntegration").removeClass("hidden");

    if (getSnapshot()?.discordId === undefined) {
      //show button
      pageElement
        .find(".section.discordIntegration .buttons")
        .removeClass("hidden");
      pageElement.find(".section.discordIntegration .info").addClass("hidden");
    } else {
      pageElement
        .find(".section.discordIntegration .buttons")
        .addClass("hidden");
      pageElement
        .find(".section.discordIntegration .info")
        .removeClass("hidden");
    }
  }
}

function updateTabs(): void {
  void swapElements(
    pageElement.find(".tab.active"),
    pageElement.find(`.tab[data-tab="${state.tab}"]`),
    250,
    async () => {
      //
    },
    async () => {
      pageElement.find(".tab").removeClass("active");
      pageElement.find(`.tab[data-tab="${state.tab}"]`).addClass("active");
    }
  );
  pageElement.find("button").removeClass("active");
  pageElement.find(`button[data-tab="${state.tab}"]`).addClass("active");
}

function updateAccountSections(): void {
  pageElement
    .find(".section.optOutOfLeaderboards .optedOut")
    .addClass("hidden");
  pageElement
    .find(".section.optOutOfLeaderboards .buttons")
    .removeClass("hidden");
  pageElement.find(".section.setStreakHourOffset .info").addClass("hidden");
  pageElement
    .find(".section.setStreakHourOffset .buttons")
    .removeClass("hidden");

  const snapshot = getSnapshot();
  if (snapshot?.lbOptOut === true) {
    pageElement
      .find(".section.optOutOfLeaderboards .optedOut")
      .removeClass("hidden");
    pageElement
      .find(".section.optOutOfLeaderboards .buttons")
      .addClass("hidden");
  }
  if (snapshot?.streakHourOffset !== undefined) {
    pageElement
      .find(".section.setStreakHourOffset .info")
      .removeClass("hidden");
    const sign = snapshot?.streakHourOffset > 0 ? "+" : "";
    pageElement
      .find(".section.setStreakHourOffset .info span")
      .text(sign + snapshot?.streakHourOffset);
    pageElement
      .find(".section.setStreakHourOffset .buttons")
      .addClass("hidden");
  }
}

export function updateUI(): void {
  if (ActivePage.get() !== "accountSettings") return;
  updateAuthenticationSections();
  updateIntegrationSections();
  updateAccountSections();
  void ApeKeyTable.update(updateUI);
  updateTabs();
  page.setUrlParams(state);
}

$(".page.pageAccountSettings").on("click", ".tabs button", (event) => {
  state.tab = $(event.target).data("tab") as State["tab"];
  updateTabs();
  page.setUrlParams(state);
});

$(
  ".page.pageAccountSettings .section.discordIntegration .getLinkAndGoToOauth"
).on("click", () => {
  Loader.show();
  void Ape.users.getDiscordOAuth().then((response) => {
    if (response.status === 200) {
      window.open(response.body.data.url, "_self");
    } else {
      Notifications.add(
        "Failed to get OAuth from discord: " + response.body.message,
        -1
      );
    }
  });
});

$(".page.pageAccountSettings #setStreakHourOffset").on("click", () => {
  StreakHourOffsetModal.show();
});

export const page = new PageWithUrlParams({
  id: "accountSettings",
  display: "Account Settings",
  element: pageElement,
  path: "/account-settings",
  urlParamsSchema: UrlParameterSchema,
  afterHide: async (): Promise<void> => {
    Skeleton.remove("pageAccountSettings");
  },
  beforeShow: async (options): Promise<void> => {
    if (options.urlParams?.tab !== undefined) {
      state.tab = options.urlParams.tab;
    }
    Skeleton.append("pageAccountSettings", "main");
    pageElement.find(`.tab[data-tab="${state.tab}"]`).addClass("active");
    updateUI();
  },
});

$(() => {
  Skeleton.save("pageAccountSettings");
});
