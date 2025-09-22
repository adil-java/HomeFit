// import React, { useState, useEffect } from 'react';
// import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
// import { useTheme } from '@/contexts/ThemeContext';
// import { Text, Card, Avatar, Button, ActivityIndicator, Searchbar } from 'react-native-paper';
// import { useAuth } from '@/contexts/AuthContext';
// import { router } from 'expo-router';
// import { 
//   User, 
//   Check, 
//   X, 
//   Search, 
//   Filter,
//   Clock,
//   Store,
//   Mail,
//   Phone,
//   MapPin
// } from 'lucide-react-native';

// // Mock data - replace with actual API calls
// const mockSellers = [
//   {
//     id: '1',
//     name: 'John Doe',
//     email: 'john@example.com',
//     phone: '+1234567890',
//     storeName: 'John\'s Electronics',
//     storeAddress: '123 Main St, New York, NY',
//     status: 'pending',
//     registrationDate: '2023-05-15T10:30:00Z',
//     documents: ['business_license.pdf', 'id_proof.pdf'],
//   },
//   {
//     id: '2',
//     name: 'Jane Smith',
//     email: 'jane@example.com',
//     phone: '+1987654321',
//     storeName: 'Smith Fashion',
//     storeAddress: '456 Oak Ave, Los Angeles, CA',
//     status: 'pending',
//     registrationDate: '2023-05-18T14:45:00Z',
//     documents: ['business_license.pdf'],
//   },
//   {
//     id: '3',
//     name: 'Mike Johnson',
//     email: 'mike@example.com',
//     phone: '+1122334455',
//     storeName: 'Mike\'s Books',
//     storeAddress: '789 Pine St, Chicago, IL',
//     status: 'pending',
//     registrationDate: '2023-05-20T09:15:00Z',
//     documents: ['business_license.pdf', 'tax_id.pdf'],
//   },
// ];

// export default function SellerRequestsScreen() {
//   const { theme } = useTheme();
//   const { user } = useAuth();
//   const [sellers, setSellers] = useState(mockSellers);
//   const [filteredSellers, setFilteredSellers] = useState(mockSellers);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedSeller, setSelectedSeller] = useState<any>(null);
//   const [showDetails, setShowDetails] = useState(false);

//   // Fetch seller requests
//   const fetchSellerRequests = async () => {
//     setLoading(true);
//     try {
//       // Replace with actual API call
//       // const response = await fetch('/api/admin/seller-requests');
//       // const data = await response.json();
//       // setSellers(data);
//       // setFilteredSellers(data);
//       setLoading(false);
//     } catch (error) {
//       console.error('Error fetching seller requests:', error);
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSellerRequests();
//   }, []);

//   // Handle search
//   useEffect(() => {
//     if (searchQuery.trim() === '') {
//       setFilteredSellers(sellers);
//     } else {
//       const query = searchQuery.toLowerCase();
//       const filtered = sellers.filter(
//         seller =>
//           seller.name.toLowerCase().includes(query) ||
//           seller.email.toLowerCase().includes(query) ||
//           seller.storeName.toLowerCase().includes(query)
//       );
//       setFilteredSellers(filtered);
//     }
//   }, [searchQuery, sellers]);

//   const handleRefresh = () => {
//     setRefreshing(true);
//     fetchSellerRequests().then(() => setRefreshing(false));
//   };

//   const handleApprove = async (sellerId: string) => {
//     try {
//       // Replace with actual API call
//       // await fetch(`/api/admin/seller-requests/${sellerId}/approve`, { method: 'POST' });
      
//       // Update local state
//       const updatedSellers = sellers.map(seller =>
//         seller.id === sellerId ? { ...seller, status: 'approved' } : seller
//       );
//       setSellers(updatedSellers);
      
//       // Show success message
//       // You can use a toast or alert here
//     } catch (error) {
//       console.error('Error approving seller:', error);
//       // Show error message
//     }
//   };

//   const handleReject = async (sellerId: string) => {
//     try {
//       // Replace with actual API call
//       // await fetch(`/api/admin/seller-requests/${sellerId}/reject`, { method: 'POST' });
      
//       // Update local state
//       const updatedSellers = sellers.filter(seller => seller.id !== sellerId);
//       setSellers(updatedSellers);
      
//       // Show success message
//       // You can use a toast or alert here
//     } catch (error) {
//       console.error('Error rejecting seller:', error);
//       // Show error message
//     }
//   };

//   const formatDate = (dateString: string) => {
//     const options: Intl.DateTimeFormatOptions = {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     };
//     return new Date(dateString).toLocaleDateString(undefined, options);
//   };

//   const renderSellerCard = (seller: any) => (
//     <Card 
//       key={seller.id} 
//       style={[styles.sellerCard, { backgroundColor: theme.colors.surface }]}
//     >
//       <Card.Content>
//         <View style={styles.sellerHeader}>
//           <Avatar.Text 
//             size={48} 
//             label={seller.name.split(' ').map(n => n[0]).join('').toUpperCase()}
//             style={{ backgroundColor: theme.colors.primary }}
//             color="white"
//           />
//           <View style={styles.sellerInfo}>
//             <Text variant="titleMedium" style={{ color: theme.colors.text, fontWeight: '600' }}>
//               {seller.storeName}
//             </Text>
//             <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
//               {seller.name}
//             </Text>
//           </View>
//           <View style={[styles.statusBadge, seller.status === 'approved' ? styles.approvedBadge : styles.pendingBadge]}>
//             <Text style={styles.statusText}>
//               {seller.status === 'approved' ? 'Approved' : 'Pending'}
//             </Text>
//           </View>
//         </View>

//         <View style={styles.sellerDetails}>
//           <View style={styles.detailRow}>
//             <Mail size={16} color={theme.colors.secondary} />
//             <Text style={[styles.detailText, { color: theme.colors.text }]}>{seller.email}</Text>
//           </View>
//           <View style={styles.detailRow}>
//             <Phone size={16} color={theme.colors.secondary} />
//             <Text style={[styles.detailText, { color: theme.colors.text }]}>{seller.phone}</Text>
//           </View>
//           <View style={styles.detailRow}>
//             <MapPin size={16} color={theme.colors.secondary} />
//             <Text style={[styles.detailText, { color: theme.colors.text }]}>{seller.storeAddress}</Text>
//           </View>
//           <View style={styles.detailRow}>
//             <Clock size={16} color={theme.colors.secondary} />
//             <Text style={[styles.detailText, { color: theme.colors.secondary }]}>
//               Registered: {formatDate(seller.registrationDate)}
//             </Text>
//           </View>
//         </View>

//         {seller.documents && seller.documents.length > 0 && (
//           <View style={styles.documentsContainer}>
//             <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
//               Documents:
//             </Text>
//             {seller.documents.map((doc: string, index: number) => (
//               <TouchableOpacity 
//                 key={index} 
//                 style={styles.documentItem}
//                 onPress={() => {/* Open document viewer */}}
//               >
//                 <Text style={[styles.documentText, { color: theme.colors.primary }]}>
//                   {doc}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         )}

//         {seller.status === 'pending' && (
//           <View style={styles.actionButtons}>
//             <Button
//               mode="contained"
//               onPress={() => handleApprove(seller.id)}
//               style={[styles.approveButton, { marginRight: 8 }]}
//               icon={({ size, color }) => <Check size={size} color="white" />}
//             >
//               Approve
//             </Button>
//             <Button
//               mode="outlined"
//               onPress={() => handleReject(seller.id)}
//               style={styles.rejectButton}
//               textColor={theme.colors.error}
//               icon={({ size, color }) => <X size={size} color={theme.colors.error} />}
//             >
//               Reject
//             </Button>
//           </View>
//         )}
//       </Card.Content>
//     </Card>
//   );

//   if (loading && !refreshing) {
//     return (
//       <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
//       <View style={styles.header}>
//         <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
//           Seller Requests
//         </Text>
//         <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
//           {filteredSellers.length} pending requests
//         </Text>
//       </View>

//       <View style={styles.searchContainer}>
//         <Searchbar
//           placeholder="Search sellers..."
//           onChangeText={setSearchQuery}
//           value={searchQuery}
//           style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
//           placeholderTextColor={theme.colors.secondary}
//           icon={({ size, color }) => (
//             <Search size={size} color={theme.colors.secondary} />
//           )}
//           inputStyle={{ color: theme.colors.text }}
//         />
//         <TouchableOpacity 
//           style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
//           onPress={() => {/* Open filter modal */}}
//         >
//           <Filter size={20} color={theme.colors.primary} />
//         </TouchableOpacity>
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//             colors={[theme.colors.primary]}
//             tintColor={theme.colors.primary}
//           />
//         }
//       >
//         {filteredSellers.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Store size={48} color={theme.colors.secondary} />
//             <Text style={[styles.emptyStateText, { color: theme.colors.secondary }]}>
//               No pending seller requests found
//             </Text>
//           </View>
//         ) : (
//           filteredSellers.map(seller => renderSellerCard(seller))
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 50
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   header: {
//     padding: 16,
//     paddingBottom: 8,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 14,
//     opacity: 0.8,
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     padding: 16,
//     paddingTop: 0,
//   },
//   searchBar: {
//     flex: 1,
//     marginRight: 12,
//     borderRadius: 8,
//     elevation: 1,
//   },
//   filterButton: {
//     width: 48,
//     height: 48,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 1,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 16,
//     paddingTop: 0,
//   },
//   sellerCard: {
//     marginBottom: 16,
//     borderRadius: 12,
//     elevation: 2,
//   },
//   sellerHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   sellerInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     alignSelf: 'flex-start',
//   },
//   pendingBadge: {
//     backgroundColor: '#FEF3C7',
//   },
//   approvedBadge: {
//     backgroundColor: '#D1FAE5',
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   sellerDetails: {
//     marginBottom: 12,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   detailText: {
//     marginLeft: 8,
//     fontSize: 14,
//   },
//   documentsContainer: {
//     marginTop: 8,
//     marginBottom: 12,
//   },
//   sectionTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 8,
//   },
//   documentItem: {
//     padding: 8,
//     borderRadius: 6,
//     backgroundColor: 'rgba(0, 0, 0, 0.05)',
//     marginBottom: 4,
//   },
//   documentText: {
//     fontSize: 13,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     marginTop: 8,
//   },
//   approveButton: {
//     borderRadius: 8,
//     backgroundColor: '#10B981',
//   },
//   rejectButton: {
//     borderRadius: 8,
//     borderColor: '#EF4444',
//   },
//   emptyState: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 32,
//   },
//   emptyStateText: {
//     marginTop: 16,
//     textAlign: 'center',
//     fontSize: 16,
//   },
// });
