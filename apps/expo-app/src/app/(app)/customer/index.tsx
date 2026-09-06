import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Svg, Path } from 'react-native-svg';

import { BrandLogo } from '@/components/brand-logo';
import {
  getPortalQuotations,
  getQuotationDetails,
  postQuotationComment,
  signOut,
  getStoredUser,
} from '@/lib/auth';

const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const SLATE_LIGHT = '#cbd5e1';
const BG = '#f8fafc';
const BORDER = '#e2e8f0';
const CARD = '#ffffff';

type TabId = 'quotations' | 'messages' | 'profile';

const TABS: { id: TabId; label: string; sub?: string }[] = [
  { id: 'quotations', label: 'My Quotations' },
  { id: 'messages', label: 'Messages' },
  { id: 'profile', label: 'Profile' },
];

function statusBadgeBg(stage: string): object {
  switch (stage) {
    case 'CONFIRMED':
    case 'WON':
    case 'FULFILLED':
      return { backgroundColor: '#dcfce7', borderColor: '#86efac' };
    case 'NEGOTIATION':
    case 'UNDER_NEGOTIATION':
      return { backgroundColor: '#fef9c7', borderColor: '#fde64b' };
    case 'PENDING_APPROVAL':
      return { backgroundColor: '#ffedd5', borderColor: '#fdba74' };
    case 'APPROVED':
    case 'SENT_TO_CUSTOMER':
      return { backgroundColor: '#dbeafe', borderColor: '#93c5fd' };
    default:
      return { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' };
  }
}

// ── Inline SVG icons (mirrors lucide-react used in the web portal) ──
function FileTextIcon({ color = DARK, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-6-6z" stroke={color} strokeWidth={2} />
      <Path d="M14 2v6h6" stroke={color} strokeWidth={2} />
      <Path d="M16 18h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 18h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 18h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MessageSquareIcon({ color = DARK, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4v-2a2 2 0 0 1 2-2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function UserIcon({ color = DARK, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} />
      <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function IconFor(tab: TabId, color?: string, size?: number) {
  switch (tab) {
    case 'quotations': return <FileTextIcon color={color} size={size} />;
    case 'messages':   return <MessageSquareIcon color={color} size={size} />;
    case 'profile':    return <UserIcon color={color} size={size} />;
  }
}

export default function CustomerDashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDesktop = width >= 768;

  const [activeTab, setActiveTab] = useState<TabId>('quotations');
  const [user, setUser] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [activeQuotation, setActiveQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const messagesEndRef = useRef<ScrollView | null>(null);

  const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

  // ── Load user + quotations on mount ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [storedUser, portalRes] = await Promise.allSettled([
        getStoredUser(),
        getPortalQuotations().catch(() => ({ data: [] })),
      ]);

      if (storedUser.status === 'fulfilled' && storedUser.value) {
        setUser(storedUser.value);
      }

      const portalData = portalRes.status === 'fulfilled' ? portalRes.value : { data: [] };
      const qList = portalData.data || portalData || [];
      setQuotations(qList);

      if (qList.length > 0) {
        setActiveQuotation(qList[0]);
      }
    } catch (e) {
      console.warn('Failed to load customer data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Load messages for the active quotation ──
  const loadMessages = useCallback(async () => {
    if (!activeQuotation) {
      setMessages([]);
      return;
    }
    try {
      const res = await getQuotationDetails(activeQuotation.portalToken || activeQuotation.quoteNumber || activeQuotation.id);
      if (res.data) {
        setActiveQuotation(res.data);
        setMessages(res.data.comments || []);
      }
    } catch (e) {
      console.warn('Failed to load messages:', e);
    }
  }, [activeQuotation]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!activeQuotation || !newMessage.trim()) return;
    setSending(true);
    try {
      await postQuotationComment(
        activeQuotation.portalToken || activeQuotation.quoteNumber,
        newMessage.trim()
      );
      setNewMessage('');
      await loadMessages();
    } catch (e: any) {
      alert(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (e) {
      console.warn(e);
    } finally {
      setLoggingOut(false);
      router.replace('/(auth)/login' as never);
    }
  };

  const handleOpenQuotation = (q: any) => {
    const token = q.portalToken || q.quoteNumber || q.id;
    router.push(`/(app)/quotation/${token}` as never);
  };

  const renderStatusBadge = (stage: string) => {
    const normalized = stage?.replace(/_/g, ' ') || 'Draft';
    return (
      <View style={[styles.statusBadge, statusBadgeBg(stage)]}>
        <Text style={styles.statusText}>{normalized}</Text>
      </View>
    );
  };

  // ── Sidebar / Tab Navigation ──
  const renderNav = () => {
    const isMobile = !isDesktop;

    if (isMobile) {
      // Pill-style top tab bar (mirrors the portal's pill navigation)
      return (
        <View style={styles.pillBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillScroll}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.pillBtn,
                    isActive && styles.pillBtnActive,
                  ]}
                >
                  {IconFor(tab.id, isActive ? ACCENT : SLATE, 18)}
                  <Text style={[styles.pillBtnText, isActive && styles.pillBtnTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      );
    }

    // Desktop: persistent vertical sidebar on the left
    return (
      <View style={styles.sidebar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
            >
              {IconFor(tab.id, isActive ? ACCENT : SLATE, 20)}
              <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}

        <View style={{ marginTop: 'auto' }}>
          <Pressable onPress={handleSignOut} style={styles.sidebarItem}>
            {loggingOut ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M9 21V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v16m-6 0h6m-6 0l2-2m-2 2l2 2" stroke={SLATE} strokeWidth={2} />
              </Svg>
            )}
            <Text style={styles.sidebarItemText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Tab: QUOTATIONS ──
  const renderQuotationsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Active Quotations</Text>
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
        ) : quotations.length === 0 ? (
          <View style={styles.emptyState}>
            <FileTextIcon color={SLATE_LIGHT} size={40} />
            <Text style={styles.emptyTitle}>No Active Quotations</Text>
            <Text style={styles.emptyDesc}>
              You don't have any quotations assigned to your account yet.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {quotations.map((q) => (
              <Pressable
                key={q.id}
                style={styles.quoteCard}
                onPress={() => handleOpenQuotation(q)}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.quoteCardHeader}>
                    <Text style={styles.quoteNumber}>{q.quoteNumber || '—'}</Text>
                    {renderStatusBadge(q.stage)}
                  </View>
                  <Text style={styles.quoteTitle}>{q.title || 'Untitled Proposal'}</Text>
                  <Text style={styles.quoteMeta}>
                    {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.quoteTotal}>
                    ${Number(q.grandTotal || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.quoteArrow}>›</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Tab: MESSAGES ──
  const renderMessagesTab = () => {
    if (!activeQuotation) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Messages</Text>
          <View style={styles.emptyState}>
            <MessageSquareIcon color={SLATE_LIGHT} size={40} />
            <Text style={styles.emptyTitle}>No Active Conversation</Text>
            <Text style={styles.emptyDesc}>
              Open a quotation to start messaging your sales representative.
            </Text>
          </View>
        </View>
      );
    }

    const salesRep = activeQuotation.salesRep?.user;
    const repName = salesRep?.name || 'Sarah Jenkins';
    const repInitials = repName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <View style={styles.tabContent}>
        <View style={styles.chatContainer}>
          {/* Chat header */}
          <View style={styles.chatHeader}>
            <View style={[styles.chatAvatar, { backgroundColor: `${ACCENT}20` }]}>
              <Text style={[styles.chatAvatarText, { color: ACCENT }]}>{repInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatName}>{repName}</Text>
              <Text style={styles.chatSubtitle}>
                Active deal rep — {activeQuotation.quoteNumber}
              </Text>
            </View>
            <Pressable
              onPress={loadMessages}
              style={styles.chatRefreshBtn}
            >
              <Text style={{ fontSize: 14 }}>⏻</Text>
            </Pressable>
          </View>

          {/* Message list */}
          <ScrollView
            ref={(r) => { messagesEndRef.current = r; }}
            style={styles.chatWindow}
            contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMsgText}>
                  No messages yet. Start the conversation below.
                </Text>
              </View>
            ) : (
              messages.map((msg: any) => {
                const isCustomer = msg.authorRole === 'CUSTOMER';
                const msgDate = msg.createdAt ? new Date(msg.createdAt) : null;
                const timeLabel = msgDate
                  ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                const initials = msg.authorName
                  ? msg.authorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : isCustomer ? repInitials : 'SR';

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      isCustomer ? styles.messageBubbleCustomer : styles.messageBubbleRep,
                    ]}
                  >
                    <View style={styles.messageRow}>
                      <View
                        style={[
                          styles.messageAvatar,
                          { backgroundColor: isCustomer ? `${ACCENT}20` : '#e2e8f0' },
                        ]}
                      >
                        <Text style={[styles.messageAvatarText, { color: isCustomer ? ACCENT : SLATE }]}>
                          {initials}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.messageText, isCustomer && styles.messageTextCustomer]}>
                          {msg.message}
                        </Text>
                        {isCustomer && (
                          <Text style={styles.messageMeta}>{msg.authorName || 'You'} • {timeLabel}</Text>
                        )}
                        {!isCustomer && (
                          <Text style={styles.messageMetaRep}>{timeLabel}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Input area */}
          <View style={styles.chatInput}>
            <TextInput
              style={styles.chatInputField}
              placeholder="Message your sales representative…"
              placeholderTextColor={SLATE}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={sending || !newMessage.trim() || !activeQuotation}
              style={[
                styles.chatSendBtn,
                (sending || !newMessage.trim()) && styles.chatSendBtnDisabled,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.chatSendText}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // ── Tab: PROFILE ──
  const renderProfileTab = () => {
    const customer = activeQuotation?.customer || {};
    const orgName = customer.name || user?.name || 'Acme Corporation';
    const email = customer.email || user?.email || 'buyer@acmecorp.com';
    const tierName = customer.tier?.name || 'Enterprise Tier';
    const discountCeiling = customer.tier?.discountCeiling || 15;
    const salesRep = activeQuotation?.salesRep?.user;
    const displayName = user?.name || customer.name || 'Customer';

    const initials = displayName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Company Profile &amp; Account Settings</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: `${ACCENT}15` }]}>
              <Text style={[styles.profileAvatarText, { color: ACCENT }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
            </View>
            <Pressable style={styles.profileEditBtn}>
              <Text style={styles.profileEditText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* Two-column detail grid */}
        <View style={styles.profileGrid}>
          {/* Account Details */}
          <View style={styles.profileDetailCard}>
            <Text style={styles.profileDetailLabel}>Procurement Account Details</Text>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailSubLabel}>Organization Name</Text>
              <Text style={styles.profileDetailValue}>{orgName}</Text>
            </View>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailSubLabel}>Primary Billing Email</Text>
              <Text style={styles.profileDetailValue}>{email}</Text>
            </View>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailSubLabel}>Customer Tier & Ceiling</Text>
              <Text style={[styles.profileDetailValue, { color: '#16a34a' }]}>
                {tierName} • {discountCeiling}% standard ceiling
              </Text>
            </View>
          </View>

          {/* Sales Team */}
          <View style={styles.profileDetailCard}>
            <Text style={styles.profileDetailLabel}>Assigned Sales Team</Text>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailSubLabel}>Account Representative</Text>
              <Text style={styles.profileDetailValue}>
                {salesRep?.name || 'Sarah Jenkins'}
              </Text>
            </View>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailSubLabel}>Representative Email</Text>
              <Text style={styles.profileDetailValue}>
                {salesRep?.email || 'rep.sarah@dealflow360.com'}
              </Text>
            </View>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailSubLabel}>Service Level</Text>
              <Text style={[styles.profileDetailValue, { color: '#2563eb' }]}>
                24/7 Dedicated Deal Architect
              </Text>
            </View>
          </View>
        </View>

        {/* All quotations assigned */}
        <View style={styles.profileSection}>
          <View style={styles.profileSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileTextIcon color={ACCENT} size={16} />
              <Text style={styles.profileSectionTitle}>
                All Quotations Assigned to Your Profile ({quotations.length})
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setActiveTab('quotations');
              }}
            >
              <Text style={styles.profileSectionLink}>View in Catalog →</Text>
            </Pressable>
          </View>

          {quotations.length === 0 ? (
            <Text style={styles.profileSectionEmpty}>
              No active quotations found for your account yet.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {quotations.map((q) => (
                <View key={q.id} style={styles.quoteMiniRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={styles.quoteMiniNumber}>{q.quoteNumber || '—'}</Text>
                      <Text style={[styles.quoteMiniStatus, { backgroundColor: '#f1f5f9' }]}>
                        {q.stage?.replace(/_/g, ' ') || 'Draft'}
                      </Text>
                    </View>
                    <Text style={styles.quoteMiniTitle}>{q.title || 'Untitled Proposal'}</Text>
                    <Text style={styles.quoteMiniMeta}>
                      Total: ${Number(q.grandTotal || 0).toLocaleString()} • Valid:{' '}
                      {q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleOpenQuotation(q)}
                    style={styles.quoteMiniOpenBtn}
                  >
                    <Text style={styles.quoteMiniOpenText}>Open</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Session & sign out */}
        <View style={styles.profileSessionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.profileAvatar, { width: 40, height: 40, borderRadius: 10 }]}>
              <Text style={[styles.profileAvatarText, { color: ACCENT, fontSize: 14 }]}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.profileSessionLabel}>Active Customer Session</Text>
              <Text style={styles.profileSessionEmail}>
                Signed in as <Text style={{ color: ACCENT, fontWeight: '600' }}>{email}</Text>
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleSignOut}
            disabled={loggingOut}
            style={styles.profileSignOutBtn}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.profileSignOutText}>Sign Out</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <BrandLogo size="sm" subtitle="Customer Portal" />
        {!isDesktop && (
          <Pressable onPress={handleSignOut} disabled={loggingOut} style={styles.signOutBtn}>
            {loggingOut ? (
              <ActivityIndicator color={SLATE} size="small" />
            ) : (
              <Text style={styles.signOutText}>Sign Out</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* ── Body (sidebar + content or pills + content) ── */}
      <View style={styles.body}>
        {isDesktop ? (
          <>
            {/* Desktop sidebar */}
            <View style={styles.sidebarWrapper}>
              {renderNav()}
            </View>
            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'quotations' && renderQuotationsTab()}
              {activeTab === 'messages' && renderMessagesTab()}
              {activeTab === 'profile' && renderProfileTab()}
            </ScrollView>
          </>
        ) : (
          /* Mobile: pills at top + scrollable content */
          <View style={{ flex: 1 }}>
            {renderNav()}
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'quotations' && renderQuotationsTab()}
              {activeTab === 'messages' && renderMessagesTab()}
              {activeTab === 'profile' && renderProfileTab()}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          DealFlow360 Customer Quotation Portal
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
  },

  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE,
  },

  /* ── Body ── */
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },

  /* ── Desktop Sidebar ── */
  sidebarWrapper: {
    width: 240,
    backgroundColor: CARD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  sidebar: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  sidebarItemActive: {
    backgroundColor: `${ACCENT}10`,
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: SLATE,
  },
  sidebarItemTextActive: {
    color: ACCENT,
  },

  /* ── Mobile Pill Bar ── */
  pillBar: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 8,
  },
  pillScroll: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    marginHorizontal: 4,
  },
  pillBtnActive: {
    backgroundColor: CARD,
    borderColor: `${ACCENT}30`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pillBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE,
  },
  pillBtnTextActive: {
    color: ACCENT,
  },

  /* ── Tab Content ── */
  tabContent: {
    flex: 1,
    padding: 24,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 16,
  },

  /* ── Quotations list ── */
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quoteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  quoteNumber: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'ui-monospace', android: 'monospace', web: 'monospace' }),
    fontWeight: '700',
    color: DARK,
  },
  quoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4,
  },
  quoteMeta: {
    fontSize: 12,
    color: SLATE,
  },
  quoteTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: ACCENT,
  },
  quoteArrow: {
    fontSize: 22,
    color: SLATE_LIGHT,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#475569',
  },

  /* ── Empty states ── */
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  emptyDesc: {
    fontSize: 13,
    color: SLATE,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyMsgText: {
    fontSize: 13,
    color: SLATE,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 19,
  },

  /* ── Chat ── */
  chatContainer: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chatName: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
  },
  chatSubtitle: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },
  chatRefreshBtn: {
    marginLeft: 'auto',
    padding: 8,
  },
  chatWindow: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubble: {
    marginBottom: 4,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  messageBubbleCustomer: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT,
    borderTopRightRadius: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  messageBubbleRep: {
    alignSelf: 'flex-start',
    backgroundColor: CARD,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  messageAvatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 13,
    color: DARK,
    lineHeight: 18,
  },
  messageTextCustomer: {
    color: 'white',
  },
  messageMeta: {
    fontSize: 10,
    color: SLATE,
    marginTop: 2,
  },
  messageMetaRep: {
    fontSize: 10,
    color: SLATE,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: CARD,
  },
  chatInputField: {
    flex: 1,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: DARK,
    maxHeight: 100,
  },
  chatSendBtn: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  chatSendBtnDisabled: {
    opacity: 0.5,
  },
  chatSendText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },

  /* ── Profile ── */
  profileCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK,
  },
  profileEmail: {
    fontSize: 13,
    color: SLATE,
    marginTop: 2,
  },
  profileEditBtn: {
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  profileEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE,
  },

  profileGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  profileDetailCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 18,
    gap: 14,
  },
  profileDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  profileDetailItem: {
    gap: 2,
  },
  profileDetailSubLabel: {
    fontSize: 11,
    color: SLATE,
  },
  profileDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
  },

  profileSection: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
    padding: 18,
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  profileSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  profileSectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
  },
  profileSectionEmpty: {
    fontSize: 12,
    color: SLATE,
    textAlign: 'center',
    paddingVertical: 20,
  },

  quoteMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  quoteMiniNumber: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'ui-monospace', android: 'monospace', web: 'monospace' }),
    fontWeight: '700',
    color: DARK,
  },
  quoteMiniStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  quoteMiniTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
    marginTop: 2,
  },
  quoteMiniMeta: {
    fontSize: 11,
    color: SLATE,
    marginTop: 4,
  },
  quoteMiniOpenBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: `${ACCENT}10`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${ACCENT}30`,
  },
  quoteMiniOpenText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
  },

  profileSessionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  profileSessionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  profileSessionEmail: {
    fontSize: 12,
    color: SLATE,
    marginTop: 2,
  },
  profileSignOutBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSignOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },

  /* ── Footer ── */
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: CARD,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: SLATE,
    fontWeight: '600',
  },
});
