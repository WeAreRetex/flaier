import CustomStyledFlowDemo from "../components/CustomStyledFlowDemo.vue";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("CustomStyledFlowDemo", CustomStyledFlowDemo);
});
