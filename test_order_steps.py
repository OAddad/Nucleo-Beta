#!/usr/bin/env python3

import sys
sys.path.append('/app')

from backend_test import CMVMasterAPITester

def main():
    """Test Order Steps Combo System specifically"""
    print("🚀 Testing Order Steps Combo System...")
    
    tester = CMVMasterAPITester()
    
    try:
        success = tester.test_order_steps_combo_system()
        
        if success:
            print("\n🎉 Order Steps Combo System tests completed successfully!")
            return 0
        else:
            print("\n❌ Order Steps Combo System tests failed!")
            return 1
            
    except Exception as e:
        print(f"❌ Testing failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())