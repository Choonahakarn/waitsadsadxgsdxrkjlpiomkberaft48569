// Helper script to find user and set as admin
// This will help you find the user_id first

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bwimmqwtmrprnrhdszts.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_mwHFA_T0uZjVcvjrIZv4Ig_yHqSQQGR';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findAndSetAdmin() {
  try {
    console.log('🔍 Searching for user "SoulHuman"...\n');
    
    // Search in profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or('email.ilike.%soulhuman%,full_name.ilike.%soulhuman%');
    
    if (profileError) throw profileError;
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ User not found. Searching in auth.users...\n');
      
      // Try searching in auth (requires admin access)
      const { data: users, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.log('⚠️  Cannot access auth.users directly');
        console.log('\n💡 Please run this SQL in Supabase Dashboard:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
        console.log('   2. Run the SQL from: make-soulhuman-admin.sql');
        return;
      }
      
      const soulHumanUser = users.users.find(u => 
        u.email?.toLowerCase().includes('soulhuman') ||
        u.user_metadata?.full_name?.toLowerCase().includes('soulhuman')
      );
      
      if (soulHumanUser) {
        console.log('✅ Found user:', soulHumanUser.email);
        console.log('   User ID:', soulHumanUser.id);
        console.log('\n📝 SQL to run:');
        console.log(`INSERT INTO public.user_roles (user_id, role)`);
        console.log(`VALUES ('${soulHumanUser.id}', 'admin')`);
        console.log(`ON CONFLICT (user_id, role) DO NOTHING;`);
        return;
      }
    } else {
      console.log(`✅ Found ${profiles.length} user(s):\n`);
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. Email: ${profile.email}`);
        console.log(`   Name: ${profile.full_name || 'N/A'}`);
        console.log(`   User ID: ${profile.id}\n`);
      });
      
      if (profiles.length === 1) {
        const userId = profiles[0].id;
        console.log('📝 Setting as admin...\n');
        
        // Insert admin role
        const { data, error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' })
          .select();
        
        if (error) {
          if (error.code === '23505') {
            console.log('✅ User is already an admin!');
          } else {
            throw error;
          }
        } else {
          console.log('✅ Successfully set as admin!');
        }
        
        // Verify
        const { data: roles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId);
        
        console.log('\n📋 Current roles:');
        roles?.forEach(r => console.log(`   - ${r.role}`));
      } else {
        console.log('\n⚠️  Multiple users found. Please specify which user ID to use.');
        console.log('\n📝 SQL to run (replace USER_ID with one of the IDs above):');
        console.log(`INSERT INTO public.user_roles (user_id, role)`);
        console.log(`VALUES ('USER_ID', 'admin')`);
        console.log(`ON CONFLICT (user_id, role) DO NOTHING;`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please run SQL manually:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/bwimmqwtmrprnrhdszts/sql');
    console.log('   2. Run the SQL from: make-soulhuman-admin.sql');
  }
}

findAndSetAdmin();
