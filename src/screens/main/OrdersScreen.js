import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import OrderCard from '../../components/orders/OrderCard';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import Header from '../../components/common/Header';
import { getDriverOrders, acceptOrder, rejectOrder } from '../../api/orders';
import { connectSocket, onEvent, offEvent } from '../../api/socket';
import { sendLocalNotification } from '../../utils/notifications';
import useAuthStore from '../../store/authStore';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';

const { width } = Dimensions.get('window');

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const { isOnline, toggleOnlineStatus, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const switchAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  // تأثير النبض للحالة المتصلة
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline]);

  const loadOrders = async () => {
    if (!isOnline) {
      setOrders([]);
      setLoading(false);
      return;
    }
    
    const result = await getDriverOrders('pending');
    if (result.success) {
      setOrders(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [isOnline])
  );

  useEffect(() => {
    const initSocket = async () => {
      if (isOnline) {
        await connectSocket();
        
        onEvent('driver:new-order', (data) => {
          loadOrders();
          sendLocalNotification(
            'طلب جديد',
            `لديك طلب جديد من ${data.store?.name || 'متجر'}`,
            { orderId: data.id }
          );
        });
      }
    };

    initSocket();

    return () => {
      offEvent('driver:new-order');
    };
  }, [isOnline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [isOnline]);

  const handleAccept = async (orderId) => {
    setProcessingId(orderId);
    const result = await acceptOrder(orderId);
    setProcessingId(null);

    if (result.success) {
      loadOrders();
      // اهتزاز خفيف عند قبول الطلب
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {}
    }
  };

  const handleReject = async (orderId) => {
    setProcessingId(orderId);
    const result = await rejectOrder(orderId);
    setProcessingId(null);

    if (result.success) {
      loadOrders();
      // اهتزاز خفيف عند رفض الطلب
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (error) {}
    }
  };

  const handleToggleOnline = async () => {
    setIsToggling(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}
    
    const success = await toggleOnlineStatus();
    if (success) {
      // تحريك الزر
      Animated.spring(switchAnim, {
        toValue: isOnline ? 0 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      
      loadOrders();
    }
    setIsToggling(false);
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        globalStyles.emptyContainer, 
        { 
          paddingBottom: insets.bottom + 80,
          opacity: pulseAnim.interpolate({
            inputRange: [1, 1.2],
            outputRange: [1, 0.8],
          }),
        }
      ]}
    >
      <Ionicons 
        name={isOnline ? "bicycle" : "fast-food-outline"} 
        size={80} 
        color={isOnline ? colors.primary : colors.textDisabled} 
      />
      <Text style={[globalStyles.emptyText, { fontSize: 18, fontWeight: 'bold', marginTop: 20 }]}>
        {isOnline ? '✨ جاهز للاستلام ✨' : '⛔ غير متاح حالياً ⛔'}
      </Text>
      <Text style={styles.emptySubtext}>
        {isOnline 
          ? 'الطلبات الجديدة ستظهر هنا تلقائياً' 
          : 'فعّل حالة الاستقبال لتبدأ باستلام الطلبات'}
      </Text>
      {!isOnline && (
        <TouchableOpacity 
          style={styles.enableButton}
          onPress={handleToggleOnline}
          activeOpacity={0.8}
        >
          <Ionicons name="power" size={20} color={colors.surface} />
          <Text style={styles.enableButtonText}>تفعيل الاستقبال</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // زر الحالة المحسن (بديل الـ Switch)
  const StatusToggleButton = () => (
    <TouchableOpacity
      style={[
        styles.statusToggleButton,
        isOnline ? styles.statusToggleOnline : styles.statusToggleOffline,
      ]}
      onPress={handleToggleOnline}
      disabled={isToggling}
      activeOpacity={0.7}
    >
      <Animated.View 
        style={[
          styles.statusToggleInner,
          {
            transform: [{
              translateX: switchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 28],
              }),
            }],
          },
        ]}
      />
      <View style={styles.statusToggleIcons}>
        <Ionicons 
          name="checkmark-circle" 
          size={18} 
          color={isOnline ? colors.surface : colors.textDisabled} 
          style={styles.statusToggleIconLeft}
        />
        <Ionicons 
          name="close-circle" 
          size={18} 
          color={!isOnline ? colors.surface : colors.textDisabled} 
          style={styles.statusToggleIconRight}
        />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* بطاقة الحالة المحسنة */}
      <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
        <View style={styles.statusInfo}>
          <Animated.View 
            style={[
              styles.statusDotContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={[styles.statusDot, isOnline && styles.onlineDot]} />
          </Animated.View>
          <View>
            <Text style={styles.statusLabel}>حالة الاستقبال</Text>
            <Text style={[styles.statusValue, isOnline ? styles.onlineText : styles.offlineText]}>
              {isOnline ? 'متصل · جاهز للطلبات' : 'غير متصل · غير متاح'}
            </Text>
          </View>
        </View>
        
        {/* زر التبديل المحسن */}
        <StatusToggleButton />
      </View>

      {/* بطاقة معلومات المندوب المحسنة */}
      <View style={styles.driverCard}>
        <View style={[styles.driverAvatar, isOnline && styles.driverAvatarOnline]}>
          <Text style={styles.driverAvatarText}>{user?.name?.charAt(0) || 'م'}</Text>
          {isOnline && (
            <View style={styles.onlineBadge}>
              <Ionicons name="checkmark" size={10} color={colors.surface} />
            </View>
          )}
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{user?.name || 'مندوب'}</Text>
          <Text style={styles.driverPhone}>{user?.phone}</Text>
        </View>
        <View style={[styles.statsBadge, isOnline && styles.statsBadgeOnline]}>
          <Text style={styles.statsNumber}>{orders.length}</Text>
          <Text style={styles.statsLabel}>طلب جديد</Text>
        </View>
      </View>

      {/* رسالة ترحيبية عند الاتصال */}
      {isOnline && orders.length === 0 && (
        <View style={styles.welcomeCard}>
          <Ionicons name="happy-outline" size={24} color={colors.primary} />
          <Text style={styles.welcomeText}>مرحباً! أنت متصل وجاهز لاستلام الطلبات</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.safeArea} edges={['top']}>
        <Header title="الطلبات" showNotification />
        <LoadingOverlay visible={true} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.safeArea} edges={['top']}>
      <Header title="الطلبات" showNotification />
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={orders.length > 0 || isOnline ? renderHeader : null}
        renderItem={({ item, index }) => (
          <Animated.View
            style={{
              opacity: 1,
              transform: [{
                translateX: 0,
              }],
            }}
          >
            <OrderCard
              order={item}
              onAccept={() => handleAccept(item.id)}
              onReject={() => handleReject(item.id)}
              isProcessing={processingId === item.id}
            />
          </Animated.View>
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          orders.length === 0 && { flex: 1 }
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  statusCard: {
    ...globalStyles.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  statusCardOnline: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surface,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDotContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.offline,
  },
  onlineDot: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  statusLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: typography.body2,
    fontWeight: typography.bold,
  },
  onlineText: {
    color: colors.success,
  },
  offlineText: {
    color: colors.danger,
  },
  
  // زر الحالة المحسن (Toggle Button)
  statusToggleButton: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  statusToggleOnline: {
    backgroundColor: colors.success,
  },
  statusToggleOffline: {
    backgroundColor: colors.danger,
  },
  statusToggleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    position: 'absolute',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusToggleIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  statusToggleIconLeft: {
    opacity: 0.8,
  },
  statusToggleIconRight: {
    opacity: 0.8,
  },
  
  driverCard: {
    ...globalStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  driverAvatarOnline: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  driverAvatarText: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  driverAvatarOnline: {
    backgroundColor: colors.primary,
  },
  driverAvatarOnline: {
    backgroundColor: colors.primary,
  },
  driverAvatarText: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: typography.body1,
    fontWeight: typography.bold,
    color: colors.text,
  },
  driverPhone: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    minWidth: 70,
  },
  statsBadgeOnline: {
    backgroundColor: colors.primaryLight,
  },
  statsNumber: {
    fontSize: typography.h5,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  statsLabel: {
    fontSize: typography.caption,
    color: colors.primary,
  },
  emptySubtext: {
    fontSize: typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  enableButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  enableButtonText: {
    color: colors.surface,
    fontSize: typography.body1,
    fontWeight: typography.bold,
  },
  welcomeCard: {
    ...globalStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    marginTop: 8,
  },
  welcomeText: {
    fontSize: typography.body2,
    color: colors.primary,
    fontWeight: typography.medium,
    flex: 1,
  },
});