import { useState, useEffect } from 'react';
import { useUser } from './useUser';
import { supabase } from '@/lib/supabase';
import { addDays, format, parseISO } from 'date-fns';

export type Cycle = {
  id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export function useCycle() {
  const user = useUser();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCycle = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_name', user.name)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCycle(data);
    } catch (e) {
      console.error("Failed to fetch cycle from Supabase", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycle();
  }, [user]);

  const startNewCycle = async (startDate: string) => {
    if (!user) return;

    const start = parseISO(startDate);
    const end = addDays(start, 12 * 7); // 12 weeks
    const endDate = format(end, 'yyyy-MM-dd');

    try {
      // Deactivate old cycles
      await supabase
        .from('cycles')
        .update({ is_active: false })
        .eq('user_name', user.name);

      const { data, error } = await supabase
        .from('cycles')
        .insert([{
          user_name: user.name,
          start_date: startDate,
          end_date: endDate,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      setCycle(data);
    } catch (e) {
      console.error("Failed to start new cycle", e);
      throw e;
    }
  };

  const updateCycleDates = async (newStartDate: string) => {
    if (!user || !cycle) return;

    const start = parseISO(newStartDate);
    const end = addDays(start, 12 * 7); // 12 weeks
    const endDate = format(end, 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('cycles')
        .update({ start_date: newStartDate, end_date: endDate })
        .eq('id', cycle.id)
        .select()
        .single();

      if (error) throw error;
      setCycle(data);
    } catch (e) {
      console.error("Failed to update cycle dates", e);
      throw e;
    }
  };

  return { cycle, startNewCycle, updateCycleDates, loading, refresh: fetchCycle };
}
