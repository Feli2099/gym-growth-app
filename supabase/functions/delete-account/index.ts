import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to delete all user data and then the auth user
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const userId = user.id

    // Get sessions to cascade delete
    const { data: sessions } = await adminClient
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s: any) => s.id)
      const { data: exercises } = await adminClient
        .from('session_exercises')
        .select('id')
        .in('session_id', sessionIds)

      if (exercises && exercises.length > 0) {
        const exerciseIds = exercises.map((e: any) => e.id)
        await adminClient.from('exercise_sets').delete().in('exercise_id', exerciseIds)
      }
      await adminClient.from('session_exercises').delete().in('session_id', sessionIds)
    }

    await adminClient.from('workout_sessions').delete().eq('user_id', userId)
    await adminClient.from('workouts').delete().eq('user_id', userId)
    await adminClient.from('workout_checkins').delete().eq('user_id', userId)
    await adminClient.from('body_weight_tracking').delete().eq('user_id', userId)
    await adminClient.from('user_profiles').delete().eq('user_id', userId)

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
