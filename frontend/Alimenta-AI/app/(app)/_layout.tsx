import { useEffect, useState } from 'react';
import { Redirect, usePathname, useSegments } from 'expo-router';
import { Platform, View, ActivityIndicator, useColorScheme, StyleSheet, Pressable } from 'react-native';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NotificationBell } from '@/components/NotificationBell';
import { authStore } from '@/store/authStore';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppLayout() {
  const [authState, setAuthState] = useState(authStore.getState());
  const [mounted, setMounted] = useState(false);
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    setMounted(true);
    const unsub = authStore.subscribe((s) => setAuthState(s));
    return () => { unsub(); };
  }, []);

  if (!mounted || authState.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' }}>
        <ActivityIndicator size="large" color="#3c87f7" />
      </View>
    );
  }

  if (!authState.user) {
    return <Redirect href="/login" />;
  }

  // Q6.a: Guard de acesso - se user acessar pagina de outro tipo, redirect pra raiz
  // segments = ['(app)', 'donor'] | ['(app)', 'ngo'] | ['(app)', 'admin']
  const currentTab = segments[1] as string | undefined;
  const userTipo = authState.user.tipo;
  const isAdminUser = userTipo === 'admin';
  const isOnWrongPage =
    (currentTab === 'donor' && userTipo !== 'doador' && !isAdminUser) ||
    (currentTab === 'ngo' && userTipo !== 'ong' && !isAdminUser) ||
    (currentTab === 'admin' && !isAdminUser);
  if (isOnWrongPage) {
    return <Redirect href="/" />;
  }

  if (Platform.OS !== 'web') {
    return <NativeAppTabs userTipo={userTipo} />;
  }
  return <WebAppTabs userTipo={userTipo} />;
}

function NativeAppTabs({ userTipo }: { userTipo: string }) {
  const NativeTabs = require('expo-router/unstable-native-tabs').NativeTabs;
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  // Q1.1: Mobile - apenas a tab do tipo do user
  if (userTipo === 'admin') {
    return (
      <NativeTabs
        backgroundColor={colors.background}
        indicatorColor={colors.backgroundElement}
        labelStyle={{ selected: { color: colors.text } }}>
        <NativeTabs.Trigger name="admin">
          <NativeTabs.Trigger.Label>Admin</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name={userTipo === 'doador' ? 'donor' : 'ngo'}>
        <NativeTabs.Trigger.Label>{userTipo === 'doador' ? 'Doador' : 'ONG'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function WebAppTabs({ userTipo }: { userTipo: string }) {
  // Q1.1: Web - apenas a tab do tipo do user
  const homeTab = userTipo === 'doador' ? (
    <TabTrigger name="donor" href="/donor" asChild>
      <TabButton>Doador</TabButton>
    </TabTrigger>
  ) : userTipo === 'ong' ? (
    <TabTrigger name="ngo" href="/ngo" asChild>
      <TabButton>ONG</TabButton>
    </TabTrigger>
  ) : (
    <TabTrigger name="admin" href="/admin" asChild>
      <TabButton>Admin</TabButton>
    </TabTrigger>
  );

  return (
    <Tabs>
      <TabSlot style={{ height: '100%', paddingTop: Platform.OS === 'web' ? 96 : 0 }} />
      <TabList asChild>
        <CustomTabList>
          {homeTab}
          {/* Q2.2: Sino sempre visivel no header */}
          <NotificationBell />
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Alimenta-IA
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 100,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
