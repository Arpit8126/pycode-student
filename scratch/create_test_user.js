const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'],
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = 'test_student@test.com';
  const password = 'testpassword123';

  console.log(`Checking/Creating user ${email}...`);
  
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('List error:', listError);
    return;
  }
  
  const existing = users.find(u => u.email === email);
  if (existing) {
    console.log('User already exists, ID:', existing.id);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: 'teststudent',
      fullName: 'Test Student'
    }
  });

  if (error) {
    console.error('Create error:', error);
  } else {
    console.log('Created user successfully:', data.user.id);
  }
}

run();
