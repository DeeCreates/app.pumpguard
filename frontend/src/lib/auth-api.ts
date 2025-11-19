// src/lib/auth-api.ts
import { supabase } from './supabase';

export type SignUpData = {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: string;
  omc_id?: string | null;
  station_id?: string | null;
  dealer_id?: string | null;
};

export type SignInData = {
  email: string;
  password: string;
};

export type AuthResponse = {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
};

export type AppealData = {
  violation_id: string;
  appeal_reason: string;
  evidence_urls?: string[];
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
};

class AuthAPI {
  // Define role hierarchy and permissions
  private readonly roleHierarchy = {
    admin: ['admin', 'npa', 'omc', 'dealer', 'station_manager', 'attendant', 'supervisor'],
    npa: ['npa', 'omc', 'dealer', 'station_manager', 'attendant'],
    omc: ['dealer', 'station_manager', 'attendant'],
    dealer: ['station_manager', 'attendant'],
    station_manager: ['attendant'],
    attendant: [],
    supervisor: ['station_manager', 'attendant']
  };

  // All valid roles in the system
  private readonly allRoles = ['admin', 'npa', 'omc', 'dealer', 'station_manager', 'attendant', 'supervisor'];

  /**
   * Check if current user can create a user with the specified role
   */
  private async canCreateRole(creatorRole: string, targetRole: string): Promise<boolean> {
    const allowedRoles = this.roleHierarchy[creatorRole as keyof typeof this.roleHierarchy];
    return allowedRoles ? allowedRoles.includes(targetRole) : false;
  }

  /**
   * Get current user's role
   */
  private async getCurrentUserRole(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile?.role || null;
    } catch (error) {
      console.error('Error getting current user role:', error);
      return null;
    }
  }

  /**
   * Format role for display
   */
  private formatRoleDisplay(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  }

  /**
   * Validate role assignment against database constraints
   */
  private validateRoleAssignment(role: string, omc_id: string | null, station_id: string | null, dealer_id: string | null): { valid: boolean; error?: string } {
    switch (role) {
      case 'admin':
      case 'supervisor':
        if (omc_id !== null || dealer_id !== null || station_id !== null) {
          const error = `${this.formatRoleDisplay(role)} must not be assigned to OMC, dealer, or station`;
          return { valid: false, error };
        }
        break;
      
      case 'omc':
        if (omc_id === null) {
          const error = 'OMC user must be assigned to an OMC';
          return { valid: false, error };
        }
        if (dealer_id !== null || station_id !== null) {
          const error = 'OMC user cannot be assigned to dealer or station';
          return { valid: false, error };
        }
        break;
      
      case 'dealer':
        if (dealer_id === null) {
          const error = 'Dealer must be assigned to a dealer';
          return { valid: false, error };
        }
        if (omc_id !== null || station_id !== null) {
          const error = 'Dealer cannot be assigned to OMC or station';
          return { valid: false, error };
        }
        break;
      
      case 'station_manager':
      case 'attendant':
        if (station_id === null) {
          const error = `${this.formatRoleDisplay(role)} must be assigned to a station`;
          return { valid: false, error };
        }
        if (omc_id !== null || dealer_id !== null) {
          const error = `${this.formatRoleDisplay(role)} cannot be assigned to OMC or dealer`;
          return { valid: false, error };
        }
        break;
      
      default:
        const error = `Unknown role: ${role}`;
        return { valid: false, error };
    }
    
    return { valid: true };
  }

  // ===== VIOLATION MANAGEMENT METHODS =====

  /**
   * Appeal a violation - requires proper permissions
   */
  async appealViolation(appealData: AppealData): Promise<AuthResponse> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser.data?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if user can appeal this violation
      const canAppeal = await this.canAppealViolation(appealData.violation_id, currentUser.data.user.id);
      if (!canAppeal.success) {
        return canAppeal;
      }

      // Update violation status to appealed
      const { data, error } = await supabase
        .from('compliance_violations')
        .update({
          status: 'appealed',
          appeal_reason: appealData.appeal_reason,
          appeal_submitted_at: new Date().toISOString(),
          appeal_submitted_by: currentUser.data.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', appealData.violation_id)
        .select(`
          *,
          stations (name, omcs(name)),
          products (name)
        `)
        .single();

      if (error) {
        console.error('Violation appeal error:', error);
        return {
          success: false,
          error: error.message || 'Failed to submit appeal'
        };
      }

      // Log appeal activity
      await this.logViolationActivity(
        appealData.violation_id,
        'appeal_submitted',
        `Appeal submitted: ${appealData.appeal_reason}`,
        currentUser.data.user.id
      );

      console.log('Violation appealed successfully:', appealData.violation_id);
      return {
        success: true,
        message: 'Appeal submitted successfully!',
        data
      };

    } catch (error: any) {
      console.error('Violation appeal error:', error);
      return {
        success: false,
        error: 'Failed to submit appeal: ' + error.message
      };
    }
  }

  /**
   * Resolve a violation - admin/npa only
   */
  async resolveViolation(violationId: string, resolutionData: {
    resolution: string;
    final_fine_amount?: number;
    notes?: string;
  }): Promise<AuthResponse> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser.data?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if user can resolve violations
      const canResolve = await this.canManageViolations(currentUser.data.user.id);
      if (!canResolve.success) {
        return {
          success: false,
          error: 'You do not have permission to resolve violations'
        };
      }

      const updateData: any = {
        status: 'resolved',
        resolved_by: currentUser.data.user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionData.notes,
        updated_at: new Date().toISOString()
      };

      if (resolutionData.final_fine_amount !== undefined) {
        updateData.fine_amount = resolutionData.final_fine_amount;
      }

      const { data, error } = await supabase
        .from('compliance_violations')
        .update(updateData)
        .eq('id', violationId)
        .select(`
          *,
          stations (name, omcs(name)),
          products (name)
        `)
        .single();

      if (error) {
        console.error('Violation resolution error:', error);
        return {
          success: false,
          error: error.message || 'Failed to resolve violation'
        };
      }

      // Log resolution activity
      await this.logViolationActivity(
        violationId,
        'violation_resolved',
        `Violation resolved: ${resolutionData.resolution}`,
        currentUser.data.user.id
      );

      console.log('Violation resolved successfully:', violationId);
      return {
        success: true,
        message: 'Violation resolved successfully!',
        data
      };

    } catch (error: any) {
      console.error('Violation resolution error:', error);
      return {
        success: false,
        error: 'Failed to resolve violation: ' + error.message
      };
    }
  }

  /**
   * Escalate violation severity
   */
  async escalateViolation(violationId: string, newSeverity: 'medium' | 'high' | 'critical', reason: string): Promise<AuthResponse> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser.data?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check if user can escalate violations
      const canEscalate = await this.canManageViolations(currentUser.data.user.id);
      if (!canEscalate.success) {
        return {
          success: false,
          error: 'You do not have permission to escalate violations'
        };
      }

      const { data, error } = await supabase
        .from('compliance_violations')
        .update({
          severity: newSeverity,
          updated_at: new Date().toISOString()
        })
        .eq('id', violationId)
        .select(`
          *,
          stations (name, omcs(name)),
          products (name)
        `)
        .single();

      if (error) {
        console.error('Violation escalation error:', error);
        return {
          success: false,
          error: error.message || 'Failed to escalate violation'
        };
      }

      // Log escalation activity
      await this.logViolationActivity(
        violationId,
        'severity_escalated',
        `Severity escalated to ${newSeverity}: ${reason}`,
        currentUser.data.user.id
      );

      console.log('Violation escalated successfully:', violationId);
      return {
        success: true,
        message: `Violation escalated to ${newSeverity} severity!`,
        data
      };

    } catch (error: any) {
      console.error('Violation escalation error:', error);
      return {
        success: false,
        error: 'Failed to escalate violation: ' + error.message
      };
    }
  }

  /**
   * Check if user can appeal a specific violation
   */
  async canAppealViolation(violationId: string, userId: string): Promise<AuthResponse> {
    try {
      // Get violation details
      const { data: violation, error } = await supabase
        .from('compliance_violations')
        .select('station_id, stations(omc_id), status')
        .eq('id', violationId)
        .single();

      if (error || !violation) {
        return {
          success: false,
          error: 'Violation not found'
        };
      }

      // Check if violation is already resolved
      if (violation.status === 'resolved') {
        return {
          success: false,
          error: 'Cannot appeal a resolved violation'
        };
      }

      // Check if violation is already appealed
      if (violation.status === 'appealed') {
        return {
          success: false,
          error: 'Violation is already under appeal'
        };
      }

      // Get user profile to check permissions
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role, omc_id, station_id, dealer_id')
        .eq('id', userId)
        .single();

      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      // Check permissions based on role
      const userRole = userProfile.role;
      const stationOmcId = violation.stations?.omc_id;

      switch (userRole) {
        case 'admin':
        case 'npa':
        case 'supervisor':
          return { success: true, message: 'User can appeal any violation' };
        
        case 'omc':
          if (userProfile.omc_id === stationOmcId) {
            return { success: true, message: 'OMC user can appeal violations for their OMC' };
          }
          break;
        
        case 'dealer':
          // Dealers can appeal violations for stations under their dealer
          const { data: dealerStations } = await supabase
            .from('stations')
            .select('id')
            .eq('dealer_id', userProfile.dealer_id);
          
          if (dealerStations?.some(station => station.id === violation.station_id)) {
            return { success: true, message: 'Dealer can appeal violations for their stations' };
          }
          break;
        
        case 'station_manager':
          if (userProfile.station_id === violation.station_id) {
            return { success: true, message: 'Station manager can appeal violations for their station' };
          }
          break;
      }

      return {
        success: false,
        error: 'You do not have permission to appeal this violation'
      };

    } catch (error: any) {
      console.error('Error checking appeal permissions:', error);
      return {
        success: false,
        error: 'Failed to check appeal permissions: ' + error.message
      };
    }
  }

  /**
   * Check if user can manage violations
   */
  async canManageViolations(userId: string): Promise<AuthResponse> {
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      const allowedRoles = ['admin', 'npa', 'supervisor'];
      
      if (allowedRoles.includes(userProfile.role)) {
        return {
          success: true,
          message: 'User can manage violations'
        };
      }

      return {
        success: false,
        error: 'User does not have permission to manage violations'
      };

    } catch (error: any) {
      console.error('Error checking violation management permissions:', error);
      return {
        success: false,
        error: 'Failed to check permissions: ' + error.message
      };
    }
  }

  /**
   * Get violations specific to user's scope
   */
  async getUserViolations(filters: any = {}): Promise<AuthResponse> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser.data?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const userProfile = currentUser.data.profile;
      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      let query = supabase
        .from('compliance_violations')
        .select(`
          *,
          stations (name, omcs(name)),
          products (name, unit),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      switch (userProfile.role) {
        case 'omc':
          if (userProfile.omc_id) {
            // Get all stations for this OMC
            const { data: omcStations } = await supabase
              .from('stations')
              .select('id')
              .eq('omc_id', userProfile.omc_id);
            
            if (omcStations && omcStations.length > 0) {
              query = query.in('station_id', omcStations.map(s => s.id));
            }
          }
          break;
        
        case 'dealer':
          if (userProfile.dealer_id) {
            // Get all stations for this dealer
            const { data: dealerStations } = await supabase
              .from('stations')
              .select('id')
              .eq('dealer_id', userProfile.dealer_id);
            
            if (dealerStations && dealerStations.length > 0) {
              query = query.in('station_id', dealerStations.map(s => s.id));
            }
          }
          break;
        
        case 'station_manager':
        case 'attendant':
          if (userProfile.station_id) {
            query = query.eq('station_id', userProfile.station_id);
          }
          break;
        
        // admin, npa, supervisor can see all violations
      }

      // Apply additional filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.start_date) {
        query = query.gte('violation_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('violation_date', filters.end_date);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };

    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch user violations: ' + error.message
      };
    }
  }

  /**
   * Submit appeal with additional evidence
   */
  async submitAppeal(violationId: string, appealData: {
    reason: string;
    evidence_urls: string[];
    contact_info?: {
      name: string;
      phone: string;
      email: string;
    };
  }): Promise<AuthResponse> {
    try {
      const currentUser = await this.getCurrentUser();
      
      if (!currentUser.data?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Verify user can appeal this violation
      const canAppeal = await this.canAppealViolation(violationId, currentUser.data.user.id);
      if (!canAppeal.success) {
        return canAppeal;
      }

      const updateData: any = {
        status: 'appealed',
        appeal_reason: appealData.reason,
        appeal_submitted_at: new Date().toISOString(),
        appeal_submitted_by: currentUser.data.user.id,
        updated_at: new Date().toISOString()
      };

      // Store evidence URLs if provided
      if (appealData.evidence_urls && appealData.evidence_urls.length > 0) {
        updateData.appeal_evidence_urls = appealData.evidence_urls;
      }

      // Store contact information if provided
      if (appealData.contact_info) {
        updateData.appeal_contact_person = appealData.contact_info.name;
        updateData.appeal_contact_phone = appealData.contact_info.phone;
        updateData.appeal_contact_email = appealData.contact_info.email;
      }

      const { data, error } = await supabase
        .from('compliance_violations')
        .update(updateData)
        .eq('id', violationId)
        .select(`
          *,
          stations (name, omcs(name)),
          products (name)
        `)
        .single();

      if (error) {
        console.error('Appeal submission error:', error);
        return {
          success: false,
          error: error.message || 'Failed to submit appeal'
        };
      }

      // Log appeal activity
      await this.logViolationActivity(
        violationId,
        'appeal_submitted',
        `Appeal submitted with ${appealData.evidence_urls?.length || 0} evidence files`,
        currentUser.data.user.id
      );

      console.log('Appeal submitted successfully:', violationId);
      return {
        success: true,
        message: 'Appeal submitted successfully!',
        data
      };

    } catch (error: any) {
      console.error('Appeal submission error:', error);
      return {
        success: false,
        error: 'Failed to submit appeal: ' + error.message
      };
    }
  }

  /**
   * Log violation activity for audit trail
   */
  private async logViolationActivity(
    violationId: string,
    action: string,
    description: string,
    userId: string
  ): Promise<void> {
    try {
      await supabase
        .from('violation_activities')
        .insert({
          violation_id: violationId,
          action,
          description,
          performed_by: userId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging violation activity:', error);
    }
  }

  // ===== EXISTING AUTH METHODS (unchanged) =====

  async signUp({ email, password, fullName, phone, role, omc_id, station_id, dealer_id }: SignUpData): Promise<AuthResponse> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        };
      }

      // Validate role
      const targetRole = role || 'attendant';
      
      if (!this.allRoles.includes(targetRole)) {
        return {
          success: false,
          error: `Invalid role '${targetRole}'. Available roles: ${this.allRoles.join(', ')}`
        };
      }

      // 🔧 CRITICAL FIX: Auto-clean parent references for station-level roles BEFORE validation
      let cleanedOmcId = omc_id;
      let cleanedDealerId = dealer_id;
      let cleanedStationId = station_id;
      
      if (targetRole === 'station_manager' || targetRole === 'attendant') {
        console.log('⚙️ Auto-clearing OMC and Dealer IDs for station-level role:', targetRole);
        cleanedOmcId = null;
        cleanedDealerId = null;
        
        // Also ensure station_id is provided for station-level roles
        if (!cleanedStationId) {
          return {
            success: false,
            error: `${this.formatRoleDisplay(targetRole)} must be assigned to a station`
          };
        }
      }

      console.log('🔍 DEBUG - After auto-clean:', {
        role: targetRole,
        omc_id: cleanedOmcId,
        dealer_id: cleanedDealerId,
        station_id: cleanedStationId
      });

      // Enhanced role assignment validation with CLEANED values
      const assignmentValidation = this.validateRoleAssignment(
        targetRole, 
        cleanedOmcId, 
        cleanedStationId, 
        cleanedDealerId
      );
      
      if (!assignmentValidation.valid) {
        return {
          success: false,
          error: assignmentValidation.error
        };
      }

      // Check if current user has permission to create this role
      const creatorRole = await this.getCurrentUserRole();
      
      if (creatorRole && !(await this.canCreateRole(creatorRole, targetRole))) {
        return {
          success: false,
          error: `You don't have permission to create users with role '${targetRole}'. Your role: ${creatorRole}`
        };
      }

      // Create auth user with CLEANED values
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: targetRole,
            omc_id: cleanedOmcId,
            station_id: cleanedStationId,
            dealer_id: cleanedDealerId
          }
        }
      });

      if (error) {
        // If it's a user exists error, try to sign in instead
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          return await this.handleExistingUser(email, password, fullName, phone, targetRole, cleanedOmcId, cleanedStationId, cleanedDealerId);
        }
        
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user data returned from authentication'
        };
      }

      // Build profile data according to role constraints
      const profileData: any = {
        id: data.user.id,
        role: targetRole,
        full_name: fullName || email.split('@')[0],
        phone: phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Set IDs according to role constraints using CLEANED values
      switch (targetRole) {
        case 'admin':
        case 'supervisor':
          profileData.omc_id = null;
          profileData.dealer_id = null;
          profileData.station_id = null;
          break;
        case 'omc':
          profileData.omc_id = cleanedOmcId;
          profileData.dealer_id = null;
          profileData.station_id = null;
          break;
        case 'dealer':
          profileData.omc_id = null;
          profileData.dealer_id = cleanedDealerId;
          profileData.station_id = null;
          break;
        case 'station_manager':
        case 'attendant':
          profileData.omc_id = null;
          profileData.dealer_id = null;
          profileData.station_id = cleanedStationId;
          break;
      }

      console.log('📝 Final profile data being inserted:', profileData);

      // Create profile
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        // Enhanced constraint violation detection
        if (profileError.message.includes('valid_role_assignment')) {
          return {
            success: false,
            error: `Database constraint violation: ${this.formatRoleDisplay(targetRole)} role requires specific assignment rules. Please check that the user is properly assigned to the correct entity.`
          };
        }
        
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        };
      }

      return {
        success: true,
        message: `${this.formatRoleDisplay(targetRole)} account created successfully!`,
        data: { user: data.user, profile: profileResult }
      };

    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * SMART station creation - automatically detects OMC context
   */
  async createStationSmart(stationData: any): Promise<AuthResponse> {
    try {
      // Get current user to determine context
      const { data: currentUser } = await this.getCurrentUser();
      
      if (!currentUser?.user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      let omc_id = stationData.omc_id;

      // AUTO-DETECT: If user is OMC role, use their OMC ID automatically
      if (currentUser.profile?.role === 'omc') {
        if (currentUser.profile.omc_id) {
          omc_id = currentUser.profile.omc_id;
        } else {
          return {
            success: false,
            error: 'OMC user does not have an OMC assigned to their profile'
          };
        }
      }
      
      // VALIDATE: If still no OMC ID, it's required
      if (!omc_id) {
        return {
          success: false,
          error: 'OMC ID is required. Please select an OMC or ensure your user profile has an OMC assigned.'
        };
      }

      // Ensure required fields
      const enhancedStationData = {
        ...stationData,
        omc_id: omc_id,
        address: stationData.address || 'Address not provided',
        region: stationData.region || 'Region not provided'
      };

      return await this.createStation(enhancedStationData);

    } catch (error: any) {
      console.error('Smart station creation error:', error);
      return {
        success: false,
        error: 'Failed to create station: ' + error.message
      };
    }
  }

  /**
   * Create station with guaranteed non-empty code
   */
  async createStation(stationData: any): Promise<AuthResponse> {
    try {
      // Validate required fields
      if (!stationData.name) {
        return {
          success: false,
          error: 'Station name is required'
        };
      }

      if (!stationData.omc_id) {
        return {
          success: false,
          error: 'OMC ID is required'
        };
      }

      // Generate guaranteed non-empty code
      const guaranteedCode = this.generateMathematicallyGuaranteedCode(stationData.name);

      // Verify OMC exists
      const { data: omc, error: omcError } = await supabase
        .from('omcs')
        .select('id, name')
        .eq('id', stationData.omc_id)
        .single();

      if (omcError || !omc) {
        return {
          success: false,
          error: 'OMC not found'
        };
      }

      // Prepare station data
      const stationToCreate = {
        code: guaranteedCode,
        name: stationData.name,
        omc_id: stationData.omc_id,
        dealer_id: stationData.dealer_id || null,
        address: stationData.address || null,
        city: stationData.city || null,
        state: stationData.state || null,
        country: stationData.country || 'Ghana',
        zip_code: stationData.zip_code || null,
        contact_phone: stationData.contact_phone || null,
        contact_email: stationData.contact_email || null,
        is_active: true,
        latitude: stationData.latitude || null,
        longitude: stationData.longitude || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create the station
      const { data: newStation, error: createError } = await supabase
        .from('stations')
        .insert(stationToCreate)
        .select()
        .single();

      if (createError) {
        // Ultimate fallback: Use UUID-based code that cannot fail
        const ultimateCode = this.generateUltimateFallbackCode();
        
        const { data: ultimateStation, error: ultimateError } = await supabase
          .from('stations')
          .insert({ ...stationToCreate, code: ultimateCode })
          .select()
          .single();

        if (ultimateError) {
          return {
            success: false,
            error: `CRITICAL DATABASE ERROR: Cannot create station even with guaranteed codes. Please contact administrator.`
          };
        }

        return {
          success: true,
          message: 'Station created with fallback code!',
          data: ultimateStation
        };
      }

      return {
        success: true,
        message: 'Station created successfully!',
        data: newStation
      };

    } catch (error: any) {
      console.error('Unexpected station creation error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while creating the station.'
      };
    }
  }

  /**
   * Create OMC (Admin only)
   */
  async createOMC(omcData: any): Promise<AuthResponse> {
    try {
      // Generate unique OMC code
      const omcCode = await this.generateUniqueOMCCode(omcData.name);
      
      const { data: omc, error: omcError } = await supabase
        .from('omcs')
        .insert({
          name: omcData.name,
          code: omcCode,
          contact_email: omcData.contact_email,
          contact_phone: omcData.contact_phone,
          address: omcData.address,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (omcError) {
        return {
          success: false,
          error: `Failed to create OMC: ${omcError.message}`
        };
      }

      // Create OMC admin user if provided
      if (omcData.admin_email) {
        await this.signUp({
          email: omcData.admin_email,
          password: omcData.admin_password || 'TempPassword123!',
          fullName: omcData.admin_name || `Admin of ${omcData.name}`,
          phone: omcData.contact_phone,
          role: 'omc',
          omc_id: omc.id,
          station_id: null,
          dealer_id: null
        });
      }

      return {
        success: true,
        message: 'OMC created successfully!',
        data: omc
      };

    } catch (error: any) {
      console.error('OMC creation error:', error);
      return {
        success: false,
        error: 'Failed to create OMC: ' + error.message
      };
    }
  }

  /**
   * Create Station Manager (assigned to ONE specific station)
   */
  async createStationManager(omc_id: string, station_id: string, userData: any): Promise<AuthResponse> {
    try {
      // Verify the station belongs to this OMC
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('id, name, omc_id, code')
        .eq('id', station_id)
        .eq('omc_id', omc_id)
        .single();

      if (stationError || !station) {
        return {
          success: false,
          error: 'Station not found or you do not have permission to manage this station'
        };
      }

      // Check if station already has a manager
      const { data: existingManager, error: managerCheckError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('station_id', station_id)
        .eq('role', 'station_manager')
        .eq('is_active', true)
        .maybeSingle();

      if (existingManager) {
        return {
          success: false,
          error: `Station '${station.name}' already has a manager: ${existingManager.full_name} (${existingManager.email})`
        };
      }

      // Create the station manager user
      const signUpData = {
        email: userData.email,
        password: userData.password || 'TempPassword123!',
        fullName: userData.fullName,
        phone: userData.phone,
        role: 'station_manager',
        omc_id: null, // Auto-cleared by the signUp method
        station_id: station_id,
        dealer_id: null // Auto-cleared by the signUp method
      };

      return await this.signUp(signUpData);

    } catch (error: any) {
      console.error('Station Manager creation error:', error);
      return {
        success: false,
        error: 'Failed to create station manager: ' + error.message
      };
    }
  }

  /**
   * Create Dealer (can manage MULTIPLE stations)
   */
  async createDealer(omc_id: string, dealerData: any): Promise<AuthResponse> {
    try {
      // First create the dealer entity with unique code
      const dealerCode = await this.generateUniqueDealerCode();
      const { data: dealer, error: dealerError } = await supabase
        .from('dealers')
        .insert({
          name: dealerData.name,
          code: dealerCode,
          omc_id: omc_id,
          contact_email: dealerData.contact_email,
          contact_phone: dealerData.contact_phone,
          address: dealerData.address,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dealerError) {
        return {
          success: false,
          error: 'Failed to create dealer entity: ' + dealerError.message
        };
      }

      // Create the dealer user account
      const signUpData = {
        email: dealerData.email,
        password: dealerData.password || 'TempPassword123!',
        fullName: dealerData.fullName,
        phone: dealerData.contact_phone,
        role: 'dealer',
        omc_id: null,
        station_id: null,
        dealer_id: dealer.id
      };

      const userResult = await this.signUp(signUpData);

      if (userResult.success) {
        // Assign existing stations to this dealer if specified
        if (dealerData.station_ids && dealerData.station_ids.length > 0) {
          await this.assignStationsToDealer(dealer.id, dealerData.station_ids);
        }
      }

      return userResult;

    } catch (error: any) {
      console.error('Dealer creation error:', error);
      return {
        success: false,
        error: 'Failed to create dealer: ' + error.message
      };
    }
  }

  /**
   * Create multiple stations for OMC with unique codes
   */
  async createOMCStations(omc_id: string, stationsData: any[]): Promise<AuthResponse> {
    try {
      const results = [];
      const errors = [];

      for (const stationData of stationsData) {
        try {
          const stationWithOMC = { ...stationData, omc_id };
          const result = await this.createStationSmart(stationWithOMC);
          
          if (result.success) {
            results.push(result.data);
          } else {
            errors.push({ station: stationData.name, error: result.error });
          }
        } catch (error: any) {
          errors.push({ station: stationData.name, error: error.message });
          console.error('Station creation error:', stationData.name, error);
        }
      }

      return {
        success: errors.length === 0,
        message: `Created ${results.length} stations, ${errors.length} failed`,
        data: {
          created: results,
          errors: errors
        }
      };

    } catch (error: any) {
      console.error('Batch station creation error:', error);
      return {
        success: false,
        error: 'Failed to create stations: ' + error.message
      };
    }
  }

  /**
   * Get OMC dashboard with all entities
   */
  async getOMCDashboard(omc_id: string): Promise<AuthResponse> {
    try {
      console.log('📊 Getting OMC dashboard for:', omc_id);
      
      // Get OMC details
      const { data: omc, error: omcError } = await supabase
        .from('omcs')
        .select('*')
        .eq('id', omc_id)
        .single();

      if (omcError) throw omcError;

      // Get all stations under this OMC
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select('*')
        .eq('omc_id', omc_id);

      if (stationsError) throw stationsError;

      // Get all dealers under this OMC
      const { data: dealers, error: dealersError } = await supabase
        .from('dealers')
        .select('*')
        .eq('omc_id', omc_id);

      if (dealersError) throw dealersError;

      // Get user counts by role under this OMC
      const stationIds = stations?.map(s => s.id) || [];
      const dealerIds = dealers?.map(d => d.id) || [];
      
      let users = [];
      if (stationIds.length > 0 || dealerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('role, station_id, dealer_id')
          .or(`station_id.in.(${stationIds.join(',')}),dealer_id.in.(${dealerIds.join(',')})`);

        if (!usersError) users = usersData || [];
      }

      const dashboardData = {
        omc,
        stats: {
          stations: stations?.length || 0,
          dealers: dealers?.length || 0,
          stationManagers: users?.filter(u => u.role === 'station_manager').length || 0,
          attendants: users?.filter(u => u.role === 'attendant').length || 0,
        },
        stations,
        dealers
      };

      console.log('📊 OMC dashboard data loaded successfully');
      
      return {
        success: true,
        data: dashboardData
      };

    } catch (error: any) {
      console.error('OMC dashboard error:', error);
      return {
        success: false,
        error: 'Failed to load OMC dashboard: ' + error.message
      };
    }
  }

  /**
   * ADMIN DASHBOARD - System Overview
   */
  async getAdminDashboard(): Promise<AuthResponse> {
    try {
      console.log('📊 Getting Admin Dashboard...');
      
      // Get all OMCs
      const { data: omcs, error: omcsError } = await supabase
        .from('omcs')
        .select('*')
        .order('name');

      if (omcsError) throw omcsError;

      // Get all stations count
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select('id, omc_id, is_active');

      if (stationsError) throw stationsError;

      // Get all dealers count
      const { data: dealers, error: dealersError } = await supabase
        .from('dealers')
        .select('id, omc_id, is_active');

      if (dealersError) throw dealersError;

      // Get all users with roles
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('role, is_active, created_at');

      if (usersError) throw usersError;

      const dashboardData = {
        stats: {
          omcs: omcs?.length || 0,
          stations: stations?.length || 0,
          dealers: dealers?.length || 0,
          stationManagers: users?.filter(u => u.role === 'station_manager').length || 0,
          attendants: users?.filter(u => u.role === 'attendant').length || 0,
          dealersUsers: users?.filter(u => u.role === 'dealer').length || 0,
          omcUsers: users?.filter(u => u.role === 'omc').length || 0,
          totalUsers: users?.length || 0,
        },
        omcs: omcs?.map(omc => ({
          ...omc,
          stationCount: stations?.filter(s => s.omc_id === omc.id).length || 0,
          dealerCount: dealers?.filter(d => d.omc_id === omc.id).length || 0,
        })),
        recentActivity: users?.slice(0, 10) // Last 10 users
      };

      console.log('📊 Admin dashboard data loaded successfully');
      
      return {
        success: true,
        data: dashboardData
      };

    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      return {
        success: false,
        error: 'Failed to load admin dashboard: ' + error.message
      };
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Generate mathematically guaranteed non-empty code
   */
  private generateMathematicallyGuaranteedCode(name: string): string {
    let baseCode = name
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 15);

    if (!baseCode || baseCode === '') {
      baseCode = 'STATION';
    }

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const guaranteedCode = `${baseCode}_${timestamp}_${random}`;

    if (!guaranteedCode || guaranteedCode.trim() === '') {
      return `STATION_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }

    return guaranteedCode;
  }

  /**
   * Ultimate fallback - uses UUID-like format that cannot be empty
   */
  private generateUltimateFallbackCode(): string {
    const part1 = Math.random().toString(36).substring(2, 6);
    const part2 = Math.random().toString(36).substring(2, 6);
    const part3 = Math.random().toString(36).substring(2, 6);
    
    return `STN_${part1}_${part2}_${part3}`.toUpperCase();
  }

  /**
   * Generate unique OMC code
   */
  private async generateUniqueOMCCode(name: string): Promise<string> {
    let baseCode = name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 10);

    if (!baseCode) baseCode = 'OMC';

    let counter = 1;
    let suggestedCode = baseCode;

    while (true) {
      const { data: existing } = await supabase
        .from('omcs')
        .select('code')
        .eq('code', suggestedCode)
        .maybeSingle();

      if (!existing) {
        return suggestedCode;
      }

      counter++;
      suggestedCode = `${baseCode}_${counter}`;
      
      if (counter > 100) {
        suggestedCode = `${baseCode}_${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return suggestedCode;
  }

  /**
   * Generate unique dealer code
   */
  private async generateUniqueDealerCode(): Promise<string> {
    const baseCode = 'DLR';
    let counter = 1;
    let suggestedCode = `${baseCode}${counter.toString().padStart(3, '0')}`;

    while (true) {
      const { data: existing } = await supabase
        .from('dealers')
        .select('code')
        .eq('code', suggestedCode)
        .maybeSingle();

      if (!existing) {
        return suggestedCode;
      }

      counter++;
      suggestedCode = `${baseCode}${counter.toString().padStart(3, '0')}`;
      
      if (counter > 999) {
        suggestedCode = `${baseCode}${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return suggestedCode;
  }

  /**
   * Assign stations to dealer
   */
  private async assignStationsToDealer(dealer_id: string, station_ids: string[]): Promise<void> {
    try {
      await supabase
        .from('stations')
        .update({ dealer_id: dealer_id })
        .in('id', station_ids);
    } catch (error) {
      console.error('Station assignment error:', error);
    }
  }

  /**
   * Handle existing user - update profile if needed
   */
  private async handleExistingUser(email: string, password: string, fullName?: string, phone?: string, role?: string, omc_id?: string | null, station_id?: string | null, dealer_id?: string | null): Promise<AuthResponse> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return {
          success: false,
          error: 'Please log in first to manage existing users'
        };
      }

      return {
        success: false,
        error: 'User already exists. Please use "Forgot Password" to reset the password or contact an administrator to update the user profile.'
      };

    } catch (error: any) {
      console.error('Error handling existing user:', error);
      return {
        success: false,
        error: 'Failed to handle existing user: ' + error.message
      };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      // Update last_login_at in profiles table
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ 
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);
      }

      return {
        success: true,
        message: 'Signed in successfully!',
        data
      };

    } catch (error) {
      console.error('Unexpected signin error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Signed out successfully'
      };

    } catch (error) {
      console.error('Unexpected signout error:', error);
      return {
        success: false,
        error: 'Failed to sign out'
      };
    }
  }

  /**
   * Get current user with profile data
   */
  async getCurrentUser() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            omcs (*),
            stations (*),
            dealers (*)
          `)
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          return { 
            data: {
              user: authData.user,
              profile: null
            }, 
            error: null 
          };
        }

        return { 
          data: {
            user: authData.user,
            profile: profileData
          }, 
          error: null 
        };
      }

      return { data: null, error: null };
      
    } catch (error) {
      console.error('Unexpected user fetch error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get available roles for current user
   */
  async getAvailableRolesForCurrentUser(): Promise<AuthResponse> {
    try {
      const currentUserRole = await this.getCurrentUserRole();
      
      if (!currentUserRole) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const allowedRoles = this.roleHierarchy[currentUserRole as keyof typeof this.roleHierarchy] || [];
      
      return {
        success: true,
        data: {
          roles: allowedRoles,
          currentRole: currentUserRole
        }
      };

    } catch (error: any) {
      console.error('Error getting available roles:', error);
      return {
        success: false,
        error: 'Failed to get available roles: ' + error.message
      };
    }
  }

  // Add these methods back to the AuthAPI class:

  /**
   * Get all roles in the system (for reference)
   */
  async getAvailableRoles(): Promise<AuthResponse> {
    return {
      success: true,
      data: {
        roles: this.allRoles
      }
    };
  }

  /**
   * Validate if a role is valid in the system
   */
  async validateRole(role: string): Promise<boolean> {
    return this.allRoles.includes(role);
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Translate Supabase errors to user-friendly messages
   */
  private getErrorMessage(error: any): string {
    const errorMap: { [key: string]: string } = {
      'invalid_credentials': 'Invalid email or password',
      'email_not_confirmed': 'Please confirm your email address. Check your inbox or contact administrator.',
      'user_already_exists': 'An account with this email already exists',
      'weak_password': 'Password must be at least 6 characters long',
      'invalid_email': 'Please enter a valid email address',
      'email_confirmation_required': 'Please check your email to confirm your account',
      'user_not_allowed': 'Please disable email confirmation in Supabase dashboard settings',
    };

    return errorMap[error.code] || error.message || 'An error occurred';
  }
}

export const authAPI = new AuthAPI();