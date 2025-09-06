import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Bell, 
  Shield, 
  Globe, 
  Moon,
  Sun,
  Smartphone,
  Mail,
  Lock,
  Eye,
  Download,
  Trash2
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    showSwitch = false,
    switchValue = false,
    onSwitchChange,
    showArrow = true,
    danger = false
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    showArrow?: boolean;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      disabled={showSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: danger ? theme.colors.error + '20' : theme.colors.background }]}>
          <Icon size={20} color={danger ? theme.colors.error : theme.colors.primary} />
        </View>
        <View>
          <Text style={[styles.settingTitle, { color: danger ? theme.colors.error : theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={switchValue ? '#fff' : theme.colors.background}
        />
      ) : showArrow && (
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notifications
          </Text>
          
          <SettingItem
            icon={Bell}
            title="Push Notifications"
            subtitle="Receive order updates and offers"
            showSwitch
            switchValue={true}
            onSwitchChange={() => {}}
          />
          
          <SettingItem
            icon={Mail}
            title="Email Notifications"
            subtitle="Get newsletters and promotions"
            showSwitch
            switchValue={false}
            onSwitchChange={() => {}}
          />
          
          <SettingItem
            icon={Smartphone}
            title="SMS Notifications"
            subtitle="Order status via text messages"
            showSwitch
            switchValue={true}
            onSwitchChange={() => {}}
          />
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Appearance
          </Text>
          
          <SettingItem
            icon={isDark ? Moon : Sun}
            title="Dark Mode"
            subtitle={isDark ? 'Dark theme enabled' : 'Light theme enabled'}
            showSwitch
            switchValue={isDark}
            onSwitchChange={toggleTheme}
          />
          
          <SettingItem
            icon={Globe}
            title="Language"
            subtitle="English (US)"
            onPress={() => {}}
          />
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy & Security
          </Text>
          
          <SettingItem
            icon={Lock}
            title="Change Password"
            subtitle="Update your account password"
            onPress={() => {}}
          />
          
          <SettingItem
            icon={Shield}
            title="Two-Factor Authentication"
            subtitle="Add an extra layer of security"
            onPress={() => {}}
          />
          
          <SettingItem
            icon={Eye}
            title="Privacy Settings"
            subtitle="Control your data and visibility"
            onPress={() => {}}
          />
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Data & Storage
          </Text>
          
          <SettingItem
            icon={Download}
            title="Download Data"
            subtitle="Export your account data"
            onPress={() => {}}
          />
          
          <SettingItem
            icon={Trash2}
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={() => {}}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
            Danger Zone
          </Text>
          
          <SettingItem
            icon={Trash2}
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={() => {}}
            danger
            showArrow={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '300',
  },
});