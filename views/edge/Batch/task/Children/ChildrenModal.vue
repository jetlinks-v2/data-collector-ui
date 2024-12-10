<template>
    <a-modal visible :title="$t('Children.ChildrenModal.763264-0')" width="500px" @cancel="emit('close')">
        <span style="margin: 12px 0;">{{ $t('Children.ChildrenModal.763264-1') }}</span> 
        <template #footer>
            <div class="footer">
                <a-button @click="emit('close')">{{ $t('Children.ChildrenModal.763264-2') }}</a-button>
                <div>
                    <a-button type="primary" @click="emit('cancel')">{{ $t('Children.ChildrenModal.763264-3') }}</a-button>
                    <a-button type="primary" @click="emit('ok')">{{ $t('Children.ChildrenModal.763264-4') }}</a-button>
                </div>
             
            </div>
        </template>
    </a-modal>
</template>

<script setup>

const emit = defineEmits(['cancel','close','ok']);

</script>

<style lang="less" scoped>
.footer{
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
