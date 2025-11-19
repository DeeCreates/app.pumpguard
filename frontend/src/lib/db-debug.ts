import { supabase } from './supabase';

export async function debugDatabaseAccess() {
  console.log('🔍 Debugging database access...');
  
  try {
    // Test 1: Basic Supabase connection
    console.log('1. Testing Supabase connection...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('❌ Auth failed:', authError);
      return { success: false, step: 'auth', error: authError.message };
    }
    console.log('✅ Auth connection working');

    // Test 2: Try simple SELECT from profiles
    console.log('2. Testing SELECT from profiles...');
    const { data: selectData, error: selectError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (selectError) {
      console.error('❌ SELECT failed:', selectError);
      return { success: false, step: 'select', error: selectError.message };
    }
    console.log('✅ SELECT working');

    // Test 3: Check if we have any RLS issues by counting profiles
    console.log('3. Testing profile count...');
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count failed:', countError);
      return { success: false, step: 'count', error: countError.message };
    }
    console.log(`✅ Profile count: ${count}`);

    // Test 4: Try to see table structure
    console.log('4. Testing table structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Table structure check failed:', sampleError);
      return { success: false, step: 'structure', error: sampleError.message };
    }
    console.log('✅ Table structure accessible');
    console.log('Sample data:', sampleData);

    return { 
      success: true, 
      message: 'All database access tests passed!',
      data: {
        profilesCount: count,
        sampleProfile: sampleData?.[0]
      }
    };

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return { success: false, step: 'unexpected', error: error.message };
  }
}